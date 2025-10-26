from uagents import Agent, Context

# instantiate agent
visualization_agent = Agent(
    name="visualization_agent",
    seed="visualization_seed_phrase",
    port=8004,
    endpoint=["http://localhost:8004/submit"],
    mailbox=True
)

# startup handler
@visualization_agent.on_event("startup")
async def startup_function(ctx: Context):
    ctx.logger.info(f"Hello, I'm agent {visualization_agent.name} and my address is {visualization_agent.address}.")

if __name__ == "__main__":
    visualization_agent.run()
