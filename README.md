# Steps to use MobileMouse
1) Download ExpoGO on the AppStore (iOS) or the Google Play Store (Android)
2) Download 'Receiver.py' on your PC (put in a new folder for clarity)
  a) if you don't have it: download Python on https://www.python.org/downloads/
3) Run 'pip3 install asyncio websockets qrcode pynput screeninfo' on terminal
4) Scan the QR code on this link to use the app on ExpoGO: 
https://expo.dev/preview/update?message=&updateRuntimeVersion=1.0.0&createdAt=2025-09-12T22%3A57%3A34.666Z&slug=exp&projectId=64f51f70-4bad-4bde-b98c-8df106deaed2&group=ffdbe891-0bcc-427c-add8-5f8a0388c012
5) Grant necessary permissions
6) Run 'python3 Receiver.py' and scan the QR code generated on the terminal to connect your phone to your PC

# Getting an Invalid Scan?
Possible Reasons:
1) Make sure your PC is on the same Wi-Fi as your mobile device
2) Make sure to use the QR provided by the Python WebServer
Note: VPN may or may not affect results
