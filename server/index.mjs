import { createIndustrialGateway } from './gateway.mjs';

const gateway = createIndustrialGateway();
gateway.startBackgroundTasks();

gateway.server.listen(gateway.config.port, gateway.config.host, () => {
  console.info(
    JSON.stringify({
      event: 'industrial_gateway_started',
      address: `http://${gateway.config.host}:${gateway.config.port}`,
      commandsEnabled: gateway.config.allowCommands,
      aiConfigured: Boolean(gateway.config.deepseekApiKey),
      at: new Date().toISOString(),
    }),
  );
});

const shutdown = () => {
  gateway.stopBackgroundTasks();
  gateway.server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
