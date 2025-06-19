import { Text, View, Button, TextInput, StyleSheet } from "react-native";
import React, {useState} from 'react';
import App from "@/components/Accelerometer";

// Steps Needed:
  // 1) Connect Phone to PC with bluetooth
  // 2) Open the App
  // 3) PC needs to confirm the app being used
  // 4) Using Accelerometer; app becomes a mouse
const socketConnect = (buttonColor: string, setSocket : any, socket : any) => {
  // alert(buttonColor);
  if (buttonColor === "red") {
    const tempSocket = new WebSocket("ws://153.106.210.153:8765")
    setSocket(tempSocket);
  }
  else {
    socket?.close()
  }
};


const socketTest = (userText : string, socket : any) => {
  // Use Accelerometer or whatever here???

  if (userText !== "") {
    socket.send(userText); // Movements sent here
  }
  else {
  }
}

export default function Index() {
  const [buttonColor, setButtonColor] = useState("red");
  const [userText, setUserText] = useState("");
  const [socket, setSocket] = useState();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button 
      title={buttonColor === "lightgreen" ? "Connected!": "Not Connected!"}
      onPress={() => {
        buttonColor === "lightgreen" ? 
        setButtonColor("red") : 
        setButtonColor("lightgreen")
        socketConnect(buttonColor, setSocket, socket);
      }}
      color={buttonColor}></Button>

      <TextInput placeholder="Type Here..."
        placeholderTextColor={"rgba(0,0,0,0.25)"}
        style={styles.inputBox}
        value={userText}
        onChangeText={text => setUserText(text)}
      ></TextInput>

      <Button title="Connection Testing"
      onPress={()=>socketTest(userText, socket)}>

      </Button>
      {/* <App></App> */}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    // flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    // borderColor: 'red',
    borderWidth: 3,
    margin: 0,
    color: 'black',
  },
});
