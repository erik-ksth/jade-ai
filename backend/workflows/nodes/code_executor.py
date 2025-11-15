"""Code execution node for running pandas code"""

from workflows.state import WorkflowState
from tools.code_executor import CodeExecutor
from core.state import df_state


class CodeExecutorNode:
    """Executes pandas code and updates dataframe state"""
    
    def __init__(self):
        self.executor = CodeExecutor()
    
    def execute(self, state: WorkflowState) -> WorkflowState:
        """Execute pandas code if present"""
        # Check if there's code to execute
        if not state.get("pandas_code"):
            state["execution_success"] = True
            return state
        
        # Check if dataframe exists
        if not df_state.has_data():
            state["execution_success"] = False
            state["execution_error"] = "No dataset loaded"
            return state
        
        try:
            # Execute the code
            success, print_output, error, chart_data = self.executor.execute(
                state["pandas_code"],
                df_state.current_dataframe
            )
            
            # Update state
            state["execution_success"] = success
            state["print_output"] = print_output
            state["chart_data"] = chart_data
            
            if success:
                print(f"✅ Code executed successfully")
                
                # Verify dataframe still exists
                if df_state.current_dataframe is None:
                    state["execution_success"] = False
                    state["execution_error"] = "Dataframe was corrupted during execution"
            else:
                state["execution_error"] = error
                print(f"❌ Code execution failed: {error}")
                
                # Increment retry count
                state["retry_count"] = state.get("retry_count", 0) + 1
            
        except Exception as e:
            state["execution_success"] = False
            state["execution_error"] = str(e)
            state["retry_count"] = state.get("retry_count", 0) + 1
            print(f"❌ Execution exception: {e}")
        
        return state


# Singleton instance
code_executor_node = CodeExecutorNode()


def execute_code_node(state: WorkflowState) -> WorkflowState:
    """Node function for code execution"""
    return code_executor_node.execute(state)
