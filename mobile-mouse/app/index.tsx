import { Text, View, StyleSheet, TouchableOpacity, Image, Linking, Platform } from "react-native";
import React, {useState, useEffect, useRef} from 'react';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated'; 
import * as ScreenOrientation from 'expo-screen-orientation';
import Modal from 'react-native-modal';
import { Checkbox } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Function to connect to WebSocket
const socketConnect = (setSocket : React.Dispatch<React.SetStateAction<WebSocket | null>>, 
scannedData : string | null, setScanned : any, setScannedData : any) => {
  const address = `ws://${scannedData}:8765`;
  const socket : WebSocket = new WebSocket(address);

  socket.onopen = () => {
    console.log('WebSocket connected');
    setSocket(socket);
  };

  socket.onclose = (event) => {
    console.log("WebSocket closed");
    socket?.close();
    setSocket(null);
  };
};

// Function to send messages to socket
const socketSend = (userText : string, socket : WebSocket | null) => {
  // Ensure connection is OPEN
  if (socket?.readyState === 1) {
    socket?.send(userText); // Movements and relevant settings are sent here
  }
}

type TrackFingerProps = {
  data: [WebSocket | null, boolean, number, number];
};

// Function to determine trackpad behavior
const TrackFinger = ({data} : TrackFingerProps) => {
  const socket = data[0];
  const checked = data[1]; // is "Invert Scroll" checked
  const drag = data[2].toFixed(1); // drag speed
  const scroll = data[3]; // scroll speed

  const posRef = useRef({x:0,y:0}); 
  const fingerCount = useSharedValue(0);
  const lastTwoPosRef : any = useRef([]); // track scroll positions (two fingers)
  const upDown = useSharedValue<number>(0); // controls dynamic scroll speed
  const reset = useSharedValue(0); // stops position duplicates/redundancies

  const handleSocketUpdate = (event : any, fingerCount : any) => {
    // Calculate Trackpad Movements
    posRef.current = {
      x: Math.round(event.absoluteX),
      y: Math.round(event.absoluteY),
    }
    const sendPosRef = `${posRef.current.x?.toFixed(2)}, 
    ${posRef.current.y?.toFixed(2)}`;

    // Send Drag Data (one finger)
    if (fingerCount.value === 1){
      socketSend(`${"drag"}, ${sendPosRef}, ${drag}, ${scroll}`, socket);
    }
    // Send/Track Scroll Data (two fingers)
    else if (fingerCount.value === 2 ){
      if (lastTwoPosRef.current.length < 2) {
        lastTwoPosRef.current.push([
          posRef.current.x?.toFixed(2),
          posRef.current.y?.toFixed(2)]);
      }
      else {
        if (reset.value === 1) {
          for (let i = 0; i < 2; i++){
            lastTwoPosRef.current.shift();
          }
          reset.value = 0;
        }
        else {
          lastTwoPosRef.current.shift()
          lastTwoPosRef.current.push([
            posRef.current.x?.toFixed(2),
            posRef.current.y?.toFixed(2)]);
  
          upDown.value = lastTwoPosRef.current[0][1] - lastTwoPosRef.current[1][1];
        }
      }

      let msg;
      if (checked) {
        msg = `${"scroll"}, ${0}, ${upDown.value}, ${drag}, ${scroll}`;
      }
      else {
        msg = `${"scroll"}, ${0}, ${(-1)*upDown.value}, ${drag}, ${scroll}`;
      }

      socketSend(`${"reset_drag"},${0},${0},${drag},${scroll}`, socket);
      socketSend(msg, socket);
    }
  };

  // Resets x and y tracking on Python WebSocket
  const handleSocketEnd = () => {
    socketSend(`${"reset_drag"},${0},${0},${drag},${scroll}`, socket);
  };

  // Gesture that controls drag and scroll
  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onTouchesDown((event)=>{
      fingerCount.value = event.numberOfTouches;
    })
    .onTouchesUp((event)=>{
      fingerCount.value = event.numberOfTouches;
      upDown.value = 0;
      reset.value = 1;
    })
    .onUpdate(event => {
      try {
        runOnJS(handleSocketUpdate)(event, fingerCount);
      } catch (err) {
        console.error("Error updating socket:", err);
      }
    })
    .onEnd(()=>{
      runOnJS(handleSocketEnd)();
    });

  // Tap and Long Press Gestures to handle click and right-click
  const handleClick = () => {
    socketSend(`${"click"},${0},${0},${drag},${scroll}`, socket);
  }
  const click = Gesture.Tap()
    .maxDistance(10)
    .onStart(() => {
      runOnJS(handleClick)();
    })    
  const handleRightClick = () => {
    socketSend(`${"right_click"},${0},${0},${drag},${scroll}`, socket);
  }
  const rightClick = Gesture.LongPress()
    .minDuration(200) // Hold for at least 200ms
    .onStart(() => {
      runOnJS(handleRightClick)();
    })

  const handlePanRight = Gesture.Simultaneous(panGesture, rightClick)
  const gestures = Gesture.Race(handlePanRight, click)

  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.touchScreenContainer}>
      </View>
    </GestureDetector>
  )
};

export default function Index() {
  // Socket State
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Modal States
  const [isSettingVisible, setSettingVisible] = useState(false);
  const [isCameraVisible, setCameraVisible] = useState(false);
  const [isHelpVisible, setHelpVisible] = useState(false);
  const [backdrop, setBackdrop] = useState(false);

  // Setting States
  const [checked, setChecked] = useState<boolean>(false);
  const [dragValue, setDragValue] = useState<number>(0);
  const [scrollValue, setScrollValue] = useState<number>(0);

  // Camera States
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [qrCodeBounds, setQrCodeBounds] : any = useState(null);

  // const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();


  // Load Local Variables from the previous session
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const startingCheckedVal : any = await AsyncStorage.getItem("checked")
        const startingDragVal : any = await AsyncStorage.getItem("dragValue");
        const startingScrollVal : any = await AsyncStorage.getItem("scrollValue");

        setChecked(JSON.parse(startingCheckedVal));
        setDragValue(JSON.parse(startingDragVal));
        setScrollValue(JSON.parse(startingScrollVal));
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  // Set Local Variables when changes occur
  useEffect(() => {
    const setSetting = async () => {
      try {
        await AsyncStorage.setItem('checked', JSON.stringify(checked));
        await AsyncStorage.setItem('dragValue', JSON.stringify(dragValue));
        await AsyncStorage.setItem('scrollValue', JSON.stringify(scrollValue));
      } catch (e) {
        console.error('Failed to save setting', e);
      }
    };
    
    setSetting();
  }, [checked, dragValue, scrollValue]);

  // Once a qr code is scanned; attempts to connect to the WebSocket
  useEffect(()=>{
    if (!socket)
      socketConnect(setSocket, scannedData, setScanned, setScannedData);
    console.log(socket?.readyState);
  },[scannedData, socket]);

  // Cleans up QR Code Overlay
  useEffect(() => {
    if(qrCodeBounds){
      const timeout = setTimeout(() => {
        setQrCodeBounds(null); // hide the QR overlay after 2 seconds
      }, 500);
  
      return () => clearTimeout(timeout); // cleanup in case it re-runs early
    }
  },[qrCodeBounds])

  // Function to establish/display QR Code Bounds
  const getQrCodeBounds : any = () => {
    if (scanned && qrCodeBounds !== null){
    
    return(
      <View style={
        {position: "absolute",
        height: qrCodeBounds?.bounds.size.height,
        width: qrCodeBounds?.bounds.size.width,
        top: qrCodeBounds?.bounds.origin.y, 
        left: qrCodeBounds?.bounds.origin.x,
        zIndex: 1,
        borderColor: "yellow",
        borderWidth: 3,}
      }></View>)
  }};

  // Function to obtain QR Code data
  const handleBarCodeScanned = (result: string) => {
    console.log("test");
    if (!scanned) {
      setScanned(true);
      if (scannedData === null){
        setScannedData(result);
      }
    }
  };

  // Open Relevant Modal Popup
  const openPopup = (modal : string) => {
    if (modal === "settings") {
      setSettingVisible(true);
    }
    else if (modal === "help"){
      setHelpVisible(true);
    }
    else {
      setCameraVisible(true);
    }
    setBackdrop(true);
  };

  // Close Relevant Modal Popup
  const closePopup = (modal : string) => {
    if (modal === "settings") {
      setSettingVisible(false);
    }
    else if (modal === "help") {
      setHelpVisible(false);
    }
    else {
      setCameraVisible(false);
    }
  };

  // Control Modal Backdrop (dimming non-modal elements)
  useEffect(() => {
    if (!isSettingVisible || !isCameraVisible || !isHelpVisible)
      setBackdrop(false)
  }, [isSettingVisible, isCameraVisible, isHelpVisible]);

  // Ensures screen orientation is landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {backdrop && <View style={styles.customBackdrop}>
        <Text style={{color: "transparent"}}>Testing</Text>
      </View>}
      <View style={styles.container}>
        {/* Buttons Above Trackpad */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.settings}
            onPress={()=>openPopup("settings")}>
              <Image 
                source={require('../assets/images/gear-icon.webp')}
                style={styles.settingsImg}></Image>
          </TouchableOpacity>
          <TouchableOpacity style={{alignItems: "flex-start"}}
            onPress={()=>openPopup("camera")}>
            <Image 
              source={require('../assets/images/qr-icon.png')}
              style={styles.qrCodeHelpImg}>
              </Image>
          </TouchableOpacity>
          <Text style={{flex: 1}}></Text>
          {socket && <TouchableOpacity style={styles.connect}
            onPress={() => {
              setScannedData(null);
              setScanned(false);
              socket?.close();
              setSocket(null);
            }}>
              <Text style={styles.disconnectBtn}>{"Disconnect"}</Text>
          </TouchableOpacity>}
          <Text style={{flex: 1}}></Text>
          <TouchableOpacity onPress={()=>openPopup("help")} style={styles.help}>
            <Image 
              source={require('../assets/images/help(2).png')}
              style={styles.qrCodeHelpImg}>
              </Image>
          </TouchableOpacity>
        </View>
        <TrackFinger data={[socket, checked, dragValue, scrollValue]}></TrackFinger>

        {/* Settings Modal */}
        <Modal
          isVisible={isSettingVisible}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.settingModalContent}>
            <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: "bold", textDecorationLine: "underline" }}>
              Settings</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>Invert Scroll</Text>
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={checked ? 'checked' : 'unchecked'}
                onPress={() => setChecked(!checked)} color="navy">
                </Checkbox>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Drag Sensitivity [{dragValue.toFixed(1) === "0.0" ? "Default" : dragValue.toFixed(1)}]</Text>
            <View style={{position: "relative"}}>
              <Slider
                style={{ width: 300, height: 40 }}
                minimumValue={-2}
                maximumValue={5}
                step={0.1}
                value={dragValue}
                onValueChange={setDragValue}
                minimumTrackTintColor="#navy"
                maximumTrackTintColor="#navy"
                thumbTintColor="navy"
              />
              {Platform.OS === 'web' && (
              <Text style={styles.customSlider}> </Text>)}
            </View>
            {/* )} */}

            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Scroll Sensitivity [{scrollValue === 0 ? "Default" : scrollValue}]</Text>
            <View>
              <Slider
                style={{ width: 300, height: 40 }}
                minimumValue={0}
                maximumValue={5}
                step={1}
                value={scrollValue}
                onValueChange={setScrollValue}
                minimumTrackTintColor="#navy"
                maximumTrackTintColor="#navy"
                thumbTintColor="navy"
              />
              {Platform.OS === 'web' && (
              <Text style={styles.customSlider}> </Text>)}
            </View>
            <TouchableOpacity onPress={() => closePopup("settings")} style={styles.button}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Help Modal */}
        <Modal
          isVisible={isHelpVisible}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.settingModalContent}>
            <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: "bold", textDecorationLine: "underline" }}>
              Help Page</Text>
            <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: "bold"}}>Instructions</Text>
            <Text
              style={{ color: 'blue', textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://github.com/Antonio-Sepulveda/mobile-mouse/tree/main?tab=readme-ov-file#steps-to-use-mobilemouse')}
            >
              GitHub ReadME
            </Text>
            <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: "bold"}}>Invalid Scan?</Text>
            <Text>Possible Reasons:</Text>
            <Text>1 - Make sure your PC is on the same Wi-Fi as your mobile device</Text>
            <Text>2 - Make sure to use QR Code provided by the Python WebServer</Text>
            <Text>Note: VPN may or may not affect results</Text>
            <TouchableOpacity onPress={() => closePopup("help")} style={styles.button}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Camera Modal */}
        <Modal
          isVisible={isCameraVisible}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          {!permission?.granted ? 
          <View>
            <Text>We need your permission to show the camera</Text>
            <TouchableOpacity onPress={requestPermission}>
              <Text style={{borderWidth: 1}}>Grant permission</Text>
            </TouchableOpacity>
          </View> : 
          
          <View style={styles.cameraModalContent}>
            <View style={{width: "50%", height: "100%", borderWidth: 1}}>
              <CameraView
                style={styles.camera}
                onBarcodeScanned={(test)=>{
                  handleBarCodeScanned(test.data);
                  setQrCodeBounds(test);
                }}
                
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                facing={"back"}
              />
              {getQrCodeBounds()}
            </View>
            <View style={{flex: 1, alignItems: "center", gap: 10}}>
              <Text style={{ fontSize: 18, fontWeight: "bold", textDecorationLine: "underline",}}>Camera</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>QR Code Scan</Text>
              {scanned ? 
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "lightgreen" }}>Scanned</Text> :
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "red" }}>Not Scanned</Text>
              }
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>WebSocket</Text>
              {socket === null ?
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "red" }}>Not Connected</Text> :
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "lightgreen" }}>Connected</Text> 
              }
              {(socket === null && scannedData !== null) && <Text style={{ fontSize: 20, fontWeight: "bold", color: "red" }}>Invalid Scan</Text>}

              <View style={{flexDirection: "row", gap: 5}}>
              <TouchableOpacity onPress={() => {requestPermission}} style={styles.button}>
                <Text style={{ color: 'white' }}>Clear Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => closePopup("camera")} style={styles.button}>
                <Text style={{ color: 'white' }}>Close</Text>
              </TouchableOpacity>
              </View>
            </View>
          </View>}
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    marginRight: 10,
    padding: 0,
    width: '100%',
  },
  buttonsContainer: {
    flexDirection: "row",
    width: '90%',
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
  },
  touchScreenContainer: {
    borderWidth: 3,
    height: "70%",
    width: "90%",
    borderRadius: 15,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "lightblue",
  },
  settings: {
    zIndex: 1,
  },
  settingsImg: {
    width: 50,       
    height: 50,      
  },
  qrCodeHelpImg: {
    width: 40,       
    height: 40,      
  },
  qrCodeOutline: {
    position: "absolute",
    width: 10,
    height: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    borderColor: "red",
    borderWidth: 1,
  },
  connect: {
    flex: 1,
    paddingLeft: 10,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  optionsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    zIndex: 1,
  },
  settingModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  customBackdrop: {
    flex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    borderColor: "navy",
    borderWidth: 2, 
    borderRadius: 5,
  },
  camera: {
    flex: 1,
  },
  cameraModalContent: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    overflow: "hidden",
    borderWidth: 1,
  },
  help: {
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 20,
  },
  disconnectBtn: {
    borderWidth: 1, 
    borderColor: "red", 
    borderRadius: 10, 
    padding: 5 ,
    color: "red", 
    fontSize: 20,
    width: "100%",
    textAlign: "center",
  },
  customSlider: {
    backgroundColor: "lightgrey",
    color: "lightgrey",
    position: "absolute",
    flex: 1,
    justifyContent: "center",
    width: "100%",
    zIndex: -1,
    marginTop: 10,
    borderRadius: 10,
  }
});
