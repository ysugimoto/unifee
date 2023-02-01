import { URL } from "node:url";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import fastifyWebsocket, { SocketStream } from "@fastify/websocket";
import { Builder } from "./builder";
import { log, warn, error } from "./logger";

// Run local server for checking built result
export function server(builders: Array<Builder>, event: EventEmitter) {
  const server = fastify();

  // To be enable hot-reload, we also run WebSocket server and communicate to browser
  const connections = new Map<string, SocketStream>();
  server.register(fastifyWebsocket);
  server.register(async (fastify) => {
    fastify.get("/__hotreload", { websocket: true }, (conn) => {
      const id = randomUUID();
      connections.set(id, conn);
      conn.socket.on("close", () => {
        connections.delete(id);
      });
    });
  });

  server.register(async (fastify) => {
    fastify.get("*", (request, reply) => {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

      const file = builders.find((b) => b.match(pathname));
      return file
        ? reply.type("text/html").status(200).send(file.html)
        : reply.type("text/plain").status(404).send("Not Found");
    });
  });

  server.listen({ host: "127.0.0.1", port: 4001 }, (err, address) => {
    if (err) {
      error(`${err}`);
      return;
    }
    log(`Dev server started on ${address}`);
    event.on("hotreload", () => {
      warn("Browser reloading...");
      setTimeout(() => {
        for (const conn of connections.values()) {
          conn.socket.send("hotreload");
        }
      }, 300);
    });
  });
}
