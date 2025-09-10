import asyncio
import socket
import websockets # type: ignore
import qrcode

from pynput.mouse import Controller, Button
from screeninfo import get_monitors

mouse = Controller()

# Get Bounds of screen (including monitors)
def get_bounds():
  monitors = get_monitors()
  min_x = min(monitor.x for monitor in monitors)
  min_y = min(monitor.y for monitor in monitors)
  max_x = max(monitor.x + monitor.width for monitor in monitors)
  max_y = max(monitor.y + monitor.height for monitor in monitors)
  return min_x, min_y, max_x, max_y

# Function that determines bounds for the mouse movement
def bounded_mouse_move(dx, dy):
  min_x, min_y, max_x, max_y = get_bounds()

  # Left Bound
  if mouse.position[0] > min_x:
    pass
  else:
    mouse.position = (min_x + 1, mouse.position[1])

  # Right Bound
  if mouse.position[0] < max_x:
    pass
  else:
    mouse.position = (max_x - 1, mouse.position[1])

  # Upper Bound
  if mouse.position[1] > min_y:
    pass
  else:
    mouse.position = (mouse.position[0], min_y + 1)

  # Lower Bound
  if mouse.position[1] < max_y:
    pass
  else:
    mouse.position = (mouse.position[0], max_y)

  mouse.move(dx,dy)

# Track connected clients
connected_clients = set()
client_stats = {}

def get_local_ip():
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  try:
    s.connect(("8.8.8.8", 80))
    return s.getsockname()[0]
  finally:
    s.close()

async def handler(websocket):
  # Register client
  if (len(connected_clients) < 1):
    connected_clients.add(websocket)
    print(f"Client connected: {websocket.remote_address}")

  client_stats[websocket] = {"previous_x": None, "previous_y": None}
  try:
    async for message in websocket:
      name, x, y, drag, scroll = message.split(",", 4)
      x = float(x)
      y = float(y)
      drag = float(drag)
      scroll = int(scroll)

      if name == "reset_drag":
        client_stats[websocket]["previous_x"] = None
        client_stats[websocket]["previous_y"] = None
      elif name == "click":
        mouse.click(Button.left, 1)
      elif name == "right_click":
        mouse.click(Button.right, 1)
      elif name == "scroll":
        if y < 0:
          mouse.scroll(0, y-(5*scroll))
        if y > 0 :
          mouse.scroll(0, y+(5*scroll))
      else:
        if (client_stats[websocket]["previous_x"] is None
        and client_stats[websocket]["previous_y"] is None):
          client_stats[websocket]["previous_x"] = x
          client_stats[websocket]["previous_y"] = y
          pass
        else:
          delta_x = (x - client_stats[websocket]["previous_x"]) * (2.5 + drag) # Drag Sensitivity
          delta_y = (y - client_stats[websocket]["previous_y"]) * (2.5 + drag)

          bounded_mouse_move(delta_x, delta_y)

          client_stats[websocket]["previous_x"] = x
          client_stats[websocket]["previous_y"] = y
      
  except websockets.exceptions.ConnectionClosed:
      pass
  except websockets.exceptions.InvalidHandshake:
     pass
  except websockets.exceptions.InvalidMessage:
     pass
  finally:
    # Unregister client
    connected_clients.remove(websocket)
    print(f"Client disconnected: {websocket.remote_address}")

async def user_input_listener(stop_event: asyncio.Event):
  loop = asyncio.get_event_loop()
  while not stop_event.is_set():
    user_input = await loop.run_in_executor(None, input, "Type 'exit' to stop the server:\n")
    if user_input.strip().lower() in {"exit", "quit", "close"}:
      print("Stopping server...")
      stop_event.set()

async def main():
  print(f"Starting WebSocket server...")
  local_ip = get_local_ip()
  qr = qrcode.QRCode()
  qr.add_data(local_ip)
  qr.print_ascii(invert=True)

  stop_event = asyncio.Event()

  async def run_server():
    async with websockets.serve(handler, local_ip, 8765):
      # print(f"Server running at ws://{local_ip}:8765")
      await stop_event.wait()

  # async with websockets.serve(handler, local_ip, 8765):
  #   await asyncio.Future()
  await asyncio.gather(
    run_server(),
    user_input_listener(stop_event),
  )

if __name__ == "__main__":
  asyncio.run(main())