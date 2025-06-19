import asyncio
import socket
import websockets # type: ignore

# Track connected clients
connected_clients = set()

def get_local_ip():
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  try:
    s.connect(("8.8.8.8", 80))
    return s.getsockname()[0]
  finally:
    s.close()

async def handler(websocket):
  # Register client
  connected_clients.add(websocket)
  print(f"Client connected: {websocket.remote_address}, total: {len(connected_clients)}")
  try:
      async for message in websocket:
          print("Received:", message)
  except websockets.exceptions.ConnectionClosed:
      pass
  except websockets.exceptions.InvalidHandshake:
     pass
  except websockets.exceptions.InvalidMessage:
     pass
  finally:
      # Unregister client
      connected_clients.remove(websocket)
      print(f"Client disconnected: {websocket.remote_address}, total: {len(connected_clients)}")

  # print(f"Client connected from {websocket.remote_address}")
  # async for message in websocket:
  #     print("Received:", message)

async def main():
  local_ip = get_local_ip()
  print(f"Starting WebSocket server on {local_ip}:8765")
  # print(f"Starting WebSocket server...")
  async with websockets.serve(handler, local_ip, 8765):
      await asyncio.Future()

if __name__ == "__main__":
  asyncio.run(main())