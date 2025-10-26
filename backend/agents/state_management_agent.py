from uagents import Agent, Context

# instantiate agent
state_management_agent = Agent(
    name="state_management_agent",
    seed="state_management_seed_phrase",
    port=8005,
    mailbox=True
)

# startup handler
@state_management_agent.on_event("startup")
async def startup_function(ctx: Context):
    ctx.logger.info(f"Hello, I'm agent {state_management_agent.name} and my address is {state_management_agent.address}.")

if __name__ == "__main__":
    state_management_agent.run()
