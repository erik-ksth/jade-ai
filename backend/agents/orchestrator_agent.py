from uagents import Agent, Context

# instantiate agent
orchestrator_agent = Agent(
    name="ai_orchestrator_agent",
    seed="ai_orchestrator_seed_phrase",
    port=8003,
    mailbox=True
)

# startup handler
@orchestrator_agent.on_event("startup")
async def startup_function(ctx: Context):
    ctx.logger.info(f"Hello, I'm agent {orchestrator_agent.name} and my address is {orchestrator_agent.address}.")

if __name__ == "__main__":
    orchestrator_agent.run()
