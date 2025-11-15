"""Intent classification node for routing user requests"""

from typing import Dict, Any
from workflows.state import WorkflowState, WorkflowIntent
from aiAgent import ai_agent
import json


class IntentClassifier:
    """Classifies user intent to route to appropriate workflow"""
    
    def __init__(self):
        self.ai_agent = ai_agent
        self.system_prompt = """You are an intent classifier for a data analytics platform.
Analyze the user's message and classify it into one of these intents:

1. **CLEAN** - Data cleaning operations:
   - Removing duplicates, null values, or invalid data
   - Fixing data types or formats
   - Handling missing values
   - Standardizing data
   Examples: "remove duplicates", "fill missing values", "clean the data"

2. **TRANSFORM** - Data transformation operations:
   - Creating new columns or features
   - Aggregating or grouping data
   - Filtering or selecting data
   - Reshaping data (pivot, melt, etc.)
   Examples: "add a new column", "group by category", "filter rows where"

3. **ANALYZE** - Statistical analysis:
   - Calculating statistics (mean, median, correlation, etc.)
   - Finding patterns or trends
   - Comparing groups
   - Statistical tests
   Examples: "what's the average", "show correlation", "compare sales by region"

4. **VISUALIZE** - Creating charts and visualizations:
   - Creating any type of chart (bar, line, pie, scatter, etc.)
   - Plotting data
   - Visual comparisons
   Examples: "create a bar chart", "plot sales over time", "visualize the distribution"

5. **EXPLORE** - General data exploration:
   - Viewing data structure
   - Getting data summaries
   - Understanding the dataset
   - General questions about the data
   Examples: "show me the data", "what columns do I have", "describe the dataset"

Respond with ONLY a JSON object in this format:
{
    "intent": "CLEAN|TRANSFORM|ANALYZE|VISUALIZE|EXPLORE",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}"""
    
    def classify(self, state: WorkflowState) -> WorkflowState:
        """Classify user intent from message"""
        try:
            # Get user message
            user_message = state["user_message"]
            
            # Create classification prompt
            classification_prompt = f"{self.system_prompt}\n\nUser message: {user_message}"
            
            # Get classification using ai_agent
            response = self.ai_agent.client.chat.completions.create(
                model=self.ai_agent.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"User message: {user_message}"}
                ],
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Update state
            state["intent"] = WorkflowIntent(result["intent"].lower())
            state["confidence"] = result["confidence"]
            
            print(f"🎯 Intent classified: {state['intent']} (confidence: {state['confidence']:.2f})")
            
        except Exception as e:
            print(f"❌ Intent classification error: {e}")
            # Default to EXPLORE if classification fails
            state["intent"] = WorkflowIntent.EXPLORE
            state["confidence"] = 0.5
        
        return state


# Singleton instance
intent_classifier = IntentClassifier()


def classify_intent_node(state: WorkflowState) -> WorkflowState:
    """Node function for intent classification"""
    return intent_classifier.classify(state)
