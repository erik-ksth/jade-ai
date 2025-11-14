"""Chart formatting and color generation service"""

from typing import Dict, Any, List


class ChartService:
    """Handles chart formatting and styling"""
    
    BASE_COLORS = [
        "rgba(255, 99, 132, 0.8)",   # Red-Pink
        "rgba(54, 162, 235, 0.8)",   # Blue
        "rgba(255, 206, 86, 0.8)",   # Yellow
        "rgba(75, 192, 192, 0.8)",   # Teal
        "rgba(153, 102, 255, 0.8)",  # Purple
        "rgba(255, 159, 64, 0.8)",   # Orange
        "rgba(46, 204, 113, 0.8)",   # Green
        "rgba(231, 76, 60, 0.8)",    # Red
        "rgba(52, 152, 219, 0.8)",   # Light Blue
        "rgba(155, 89, 182, 0.8)",   # Violet
        "rgba(26, 188, 156, 0.8)",   # Turquoise
        "rgba(241, 196, 15, 0.8)",   # Gold
        "rgba(230, 126, 34, 0.8)",   # Carrot
        "rgba(236, 240, 241, 0.8)",  # Silver
        "rgba(149, 165, 166, 0.8)",  # Gray
    ]
    
    @classmethod
    def generate_color_palette(cls, count: int) -> List[str]:
        """
        Generate color palette for charts
        
        Args:
            count: Number of colors needed
        
        Returns:
            List of color strings
        """
        return [cls.BASE_COLORS[i % len(cls.BASE_COLORS)] for i in range(count)]
    
    @classmethod
    def format_chart_data(cls, chart_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format chart data for Chart.js frontend
        
        Args:
            chart_result: Raw chart data from code execution
                {type, labels, data, label, title}
        
        Returns:
            Formatted ChartData dictionary
        """
        # Validate chart_result is not None
        if chart_result is None:
            raise ValueError("chart_result cannot be None")
        
        chart_type = chart_result.get('type', 'bar')
        data_points = chart_result.get('data', [])
        
        # Determine colors based on chart type
        if chart_type in ['bar', 'pie', 'doughnut', 'polarArea', 'radar']:
            # Categorical charts - different colors for each segment
            colors = cls.generate_color_palette(len(data_points))
            background_colors = colors
            border_colors = [color.replace('0.8', '1') for color in colors]
        elif chart_type == 'area':
            # Area charts - single color with fill
            background_colors = "rgba(54, 162, 235, 0.3)"
            border_colors = "rgba(54, 162, 235, 1)"
        elif chart_type in ['scatter', 'bubble']:
            # Scatter/bubble - single color for all points
            background_colors = "rgba(54, 162, 235, 0.6)"
            border_colors = "rgba(54, 162, 235, 1)"
        else:  # line charts
            # Line charts - single vibrant color
            background_colors = "rgba(54, 162, 235, 0.2)"
            border_colors = "rgba(54, 162, 235, 1)"
        
        # Build dataset configuration
        dataset_config = {
            "label": chart_result.get('label', 'Data'),
            "data": data_points,
            "borderColor": border_colors,
            "backgroundColor": background_colors,
            "borderWidth": 2
        }
        
        # Add chart-specific properties
        if chart_type == 'area':
            dataset_config.update({"fill": True, "tension": 0.4})
        elif chart_type == 'line':
            dataset_config.update({"fill": False, "tension": 0.4})
        elif chart_type in ['scatter', 'bubble']:
            dataset_config.update({
                "pointRadius": 6,
                "pointHoverRadius": 8
            })
        elif chart_type == 'radar':
            dataset_config.update({
                "pointRadius": 4,
                "pointHoverRadius": 6,
                "tension": 0.2
            })
        
        return {
            "type": chart_type,
            "labels": chart_result.get('labels', []),
            "datasets": [dataset_config],
            "title": chart_result.get('title', 'Chart')
        }


# Singleton instance
chart_service = ChartService()
