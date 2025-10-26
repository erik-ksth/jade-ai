from uagents import Agent, Context

# instantiate agent
data_transformation_agent = Agent(
    name="data_transformation_agent",
    seed="data_transformation_seed_phrase",
    port=8002,
    mailbox=True
)

# startup handler
@data_transformation_agent.on_event("startup")
async def startup_function(ctx: Context):
    ctx.logger.info(f"Hello, I'm agent {data_transformation_agent.name} and my address is {data_transformation_agent.address}.")

if __name__ == "__main__":
    data_transformation_agent.run()
