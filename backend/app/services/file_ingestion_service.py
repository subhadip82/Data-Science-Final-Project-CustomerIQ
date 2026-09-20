"""
File Ingestion Service for CustomerIQ
====================================
Provides memory-conscious, scalable ingestion for CSV and XLSX datasets:
- Instant 20-row preview extraction without reading entire files
- Scalable chunked/streaming statistics for large CSV files
- Multi-sheet inspection and selection for XLSX workbooks
- SHA-256 file hashing for duplicate dataset detection
- Memory-safe, writable array conversions (preventing read-only NumPy array errors)
"""

import os
import io
import math
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
import numpy as np
import openpyxl

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configurable thresholds
CHUNK_SIZE_ROWS = 50_000
LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024  # 10 MB


class FileIngestionService:
    @staticmethod
    def compute_file_hash(file_bytes: bytes) -> str:
        """Computes SHA-256 checksum of raw file bytes for idempotency and duplicate checking."""
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def inspect_xlsx_sheets(file_path: str | Path) -> List[str]:
        """
        Extracts sheet names from an XLSX file without loading cell data into memory.
        Uses openpyxl read_only mode for instant, lightweight metadata retrieval.
        """
        try:
            wb = openpyxl.load_workbook(str(file_path), read_only=True, keep_links=False)
            sheet_names = wb.sheetnames
            wb.close()
            return sheet_names or ["Sheet1"]
        except Exception as e:
            logger.warning(f"Failed to inspect XLSX sheets via openpyxl: {e}. Falling back to default.")
            return ["Sheet1"]

    @staticmethod
    def extract_lightweight_preview(
        file_path: str | Path,
        file_type: str,
        sheet_name: Optional[str] = None,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """
        Reads strictly the top `limit` (default 20) rows directly from disk without
        loading or parsing the remainder of the dataset into memory.
        
        Returns:
            (preview_rows, column_names, column_metadata_list)
        """
        file_path = Path(file_path)
        ext = file_type.lower().strip(".")

        if ext in ("xlsx", "xls"):
            # Read top `limit` rows of specified sheet
            try:
                sheet = sheet_name or 0
                df_preview = pd.read_excel(file_path, sheet_name=sheet, nrows=limit)
            except Exception as e:
                logger.error(f"Error reading Excel preview: {e}")
                df_preview = pd.DataFrame()
        else:
            # Read top `limit` rows of CSV with encoding fallbacks
            try:
                df_preview = pd.read_csv(file_path, nrows=limit, encoding="utf-8")
            except UnicodeDecodeError:
                df_preview = pd.read_csv(file_path, nrows=limit, encoding="latin1")

        # Clean column names and ensure safe, mutable dataframe
        df_preview = df_preview.copy(deep=True)
        df_preview.columns = [str(c).strip() for c in df_preview.columns]

        columns = list(df_preview.columns)
        
        # Build column types and sample values for modal Section A & B
        col_metadata: List[Dict[str, Any]] = []
        for col in columns:
            series = df_preview[col]
            inferred_type = "text"
            if pd.api.types.is_bool_dtype(series):
                inferred_type = "boolean"
            elif pd.api.types.is_integer_dtype(series):
                inferred_type = "integer"
            elif pd.api.types.is_float_dtype(series):
                inferred_type = "float"
            elif pd.api.types.is_datetime64_any_dtype(series):
                inferred_type = "datetime"
            else:
                # Test if string column looks like datetime or numeric
                non_null = series.dropna().astype(str)
                if len(non_null) > 0 and len(non_null) <= 5:
                    inferred_type = "categorical"
                else:
                    inferred_type = "text"

            sample_vals = series.dropna().head(5).tolist()
            # Clean numpy types from sample_vals for JSON serialization
            sample_vals = [
                bool(v) if isinstance(v, (np.bool_, bool))
                else int(v) if isinstance(v, (np.integer, int))
                else float(v) if isinstance(v, (np.floating, float)) and not math.isnan(v)
                else str(v)
                for v in sample_vals
            ]

            col_metadata.append({
                "name": col,
                "data_type": inferred_type,
                "sample_values": sample_vals,
            })

        # Format rows JSON-safe
        rows: List[Dict[str, Any]] = []
        for idx, record in df_preview.iterrows():
            row_dict: Dict[str, Any] = {}
            for col in columns:
                val = record[col]
                if pd.isna(val):
                    row_dict[col] = None
                elif isinstance(val, (np.integer, int)):
                    row_dict[col] = int(val)
                elif isinstance(val, (np.floating, float)):
                    row_dict[col] = None if math.isnan(val) else round(float(val), 4)
                elif isinstance(val, (np.bool_, bool)):
                    row_dict[col] = bool(val)
                else:
                    row_dict[col] = str(val)
            rows.append(row_dict)

        return rows, columns, col_metadata

    @staticmethod
    def profile_dataset_scalable(
        file_path: str | Path,
        file_type: str,
        sheet_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Profiles a dataset. For small-to-medium files, processes directly.
        For large CSV files, processes in streaming chunks without loading full
        file into memory or concatenating dataframes.
        """
        file_path = Path(file_path)
        file_size = file_path.stat().st_size
        ext = file_type.lower().strip(".")

        is_large = (ext == "csv" and file_size > LARGE_FILE_THRESHOLD_BYTES)

        if not is_large:
            # Memory-safe direct read
            if ext in ("xlsx", "xls"):
                sheet = sheet_name or 0
                df = pd.read_excel(file_path, sheet_name=sheet)
            else:
                try:
                    df = pd.read_csv(file_path, encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding="latin1")

            df = df.copy(deep=True)
            df.columns = [str(c).strip() for c in df.columns]
            
            # Import universal profiler
            from app.ml.universal_profiler import profile_dataset
            return profile_dataset(df)

        # Large CSV Streaming Profile
        logger.info(f"Using streaming chunked profiler for large CSV: {file_path.name} ({file_size / (1024*1024):.1f} MB)")
        return FileIngestionService._profile_csv_chunks(file_path)

    @staticmethod
    def _profile_csv_chunks(file_path: Path, chunk_size: int = CHUNK_SIZE_ROWS) -> Dict[str, Any]:
        """Streaming chunked aggregator for CSVs > 10MB."""
        total_rows = 0
        columns: List[str] = []
        null_counts: Dict[str, int] = {}
        type_detectors: Dict[str, set] = {}
        sample_values: Dict[str, list] = {}
        numeric_sums: Dict[str, float] = {}
        numeric_mins: Dict[str, float] = {}
        numeric_maxs: Dict[str, float] = {}

        try:
            reader = pd.read_csv(file_path, chunksize=chunk_size, encoding="utf-8")
        except UnicodeDecodeError:
            reader = pd.read_csv(file_path, chunksize=chunk_size, encoding="latin1")

        for chunk_idx, chunk in enumerate(reader):
            # Clean chunk columns
            chunk = chunk.copy(deep=True)
            chunk.columns = [str(c).strip() for c in chunk.columns]
            if chunk_idx == 0:
                columns = list(chunk.columns)
                for col in columns:
                    null_counts[col] = 0
                    type_detectors[col] = set()
                    sample_values[col] = []
                    numeric_sums[col] = 0.0
                    numeric_mins[col] = float("inf")
                    numeric_maxs[col] = float("-inf")

            total_rows += len(chunk)

            for col in columns:
                series = chunk[col]
                null_counts[col] += int(series.isna().sum())

                # Collect first few samples
                if len(sample_values[col]) < 5:
                    non_nulls = series.dropna().head(5 - len(sample_values[col])).tolist()
                    sample_values[col].extend(non_nulls)

                # Check if numeric
                if pd.api.types.is_numeric_dtype(series):
                    valid_num = series.dropna()
                    if len(valid_num) > 0:
                        numeric_sums[col] += float(valid_num.sum())
                        numeric_mins[col] = min(numeric_mins[col], float(valid_num.min()))
                        numeric_maxs[col] = max(numeric_maxs[col], float(valid_num.max()))
                        type_detectors[col].add("numeric")
                else:
                    type_detectors[col].add("text")

            # Explicitly release chunk
            del chunk

        # Compile final profile metadata
        total_cells = total_rows * max(len(columns), 1)
        total_missing = sum(null_counts.values())
        overall_missing_pct = round((total_missing / max(total_cells, 1)) * 100.0, 2)

        column_profiles: List[Dict[str, Any]] = []
        numeric_cols_count = 0
        cat_cols_count = 0
        date_cols_count = 0
        text_cols_count = 0

        for col in columns:
            is_num = "numeric" in type_detectors[col] and "text" not in type_detectors[col]
            dtype = "float" if is_num else "text"
            if is_num:
                numeric_cols_count += 1
            else:
                text_cols_count += 1

            miss_cnt = null_counts[col]
            miss_pct = round((miss_cnt / max(total_rows, 1)) * 100.0, 2)
            
            stats_dict: Dict[str, Any] = {}
            if is_num and total_rows > miss_cnt:
                count_valid = total_rows - miss_cnt
                stats_dict = {
                    "min": numeric_mins[col] if numeric_mins[col] != float("inf") else 0,
                    "max": numeric_maxs[col] if numeric_maxs[col] != float("-inf") else 0,
                    "mean": round(numeric_sums[col] / count_valid, 2),
                }

            column_profiles.append({
                "name": col,
                "original_name": col,
                "data_type": dtype,
                "semantic_type": "monetary" if "amount" in col.lower() or "price" in col.lower() or "revenue" in col.lower() else "generic",
                "missing_count": miss_cnt,
                "missing_pct": miss_pct,
                "unique_count": 0,
                "sample_values": sample_values[col][:5],
                "stats": stats_dict,
                "outlier_count": 0,
            })

        # Quality score calculation
        quality_deductions = min(overall_missing_pct * 1.5, 40)
        quality_score = round(max(100.0 - quality_deductions, 10.0), 1)

        issues = []
        if overall_missing_pct > 10:
            issues.append(f"High missingness: {overall_missing_pct}% of values across dataset are empty.")

        return {
            "row_count": total_rows,
            "column_count": len(columns),
            "memory_usage_kb": round((file_path.stat().st_size) / 1024, 1),
            "missing_cells": total_missing,
            "missing_pct": overall_missing_pct,
            "duplicates": 0,  # Omitted for huge streaming files to prevent OOM
            "quality_score": quality_score,
            "type_counts": {
                "numeric": numeric_cols_count,
                "categorical": cat_cols_count,
                "datetime": date_cols_count,
                "text": text_cols_count,
            },
            "columns": column_profiles,
            "issues": issues,
            "recommendations": ["Dataset successfully ingested using streaming chunked processing."],
            "is_large_dataset": True,
        }
