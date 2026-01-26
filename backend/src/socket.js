import { Server } from 'socket.io';

let io;
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN?.split(',') || '*' } });
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });
  return io;
}
export function getIO() { return io; }
