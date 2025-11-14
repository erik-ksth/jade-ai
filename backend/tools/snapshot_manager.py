"""Snapshot management for dataframe undo/redo functionality"""

from typing import Optional
import pandas as pd
from collections import deque


class SnapshotManager:
    """Manages dataframe snapshots for undo functionality"""
    
    def __init__(self, max_snapshots: int = 5):
        self._snapshots: deque = deque(maxlen=max_snapshots)
        self._max_snapshots = max_snapshots
    
    def create(self, df: pd.DataFrame) -> bool:
        """Create a snapshot of the dataframe"""
        if df is not None:
            self._snapshots.append(df.copy())
            return True
        return False
    
    def restore(self) -> Optional[pd.DataFrame]:
        """Restore the last snapshot"""
        if self._snapshots:
            return self._snapshots.pop()
        return None
    
    def clear(self):
        """Clear all snapshots"""
        self._snapshots.clear()
    
    def count(self) -> int:
        """Get number of available snapshots"""
        return len(self._snapshots)
    
    def has_snapshots(self) -> bool:
        """Check if any snapshots exist"""
        return len(self._snapshots) > 0
