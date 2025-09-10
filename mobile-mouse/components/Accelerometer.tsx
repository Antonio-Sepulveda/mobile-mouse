import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';

// making an app to make my phone move my mouse cursor

// I am currently trying to find a way to send the acceleration data from the accelerometer to represent the phone moving, however it doesn't seem to be accurate enough

// what else can I attempt to use? Or am I doing something wrong?

export default function App() {
  // const [{ x, y, z }, setData] : any = useState({
  //   x: 0,
  //   y: 0,
  //   z: 0,
  // });
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });


  const [subscription, setSubscription] : any = useState(null);
  // const _slow = () => Accelerometer.setUpdateInterval(1000);
  // const _fast = () => Accelerometer.setUpdateInterval(16);
  const _slow = () => DeviceMotion.setUpdateInterval(1000);
  const _fast = () => DeviceMotion.setUpdateInterval(16);

  // if (Math.abs(x) > 0.1){
  // console.log(Math.abs(x))
  // }
  useEffect(() => {
    if (Math.abs(acceleration.x)   > 1) {
      console.log('X:', acceleration.x);
    }
    
  }, [acceleration.x]);

  const _subscribe = () => {
    // setSubscription(Accelerometer.addListener(setData));
    setSubscription(
      DeviceMotion.addListener((motionData) => {
        if (motionData.acceleration) {
          const { x, y, z } = motionData.acceleration;
          setAcceleration({ x, y, z });
        }
      })
    );
  };

  const _unsubscribe = () => {
    // subscription && subscription.remove();
    subscription?.remove();
    setSubscription(null);
  };

  useEffect(() => {
    _subscribe();
    return () => _unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>DeviceMotion: (in gs where 1g = 9.81 m/s^2)</Text>
      {/* <Text style={styles.text}>x: {x}</Text>
      <Text style={styles.text}>y: {y}</Text>
      <Text style={styles.text}>z: {z}</Text> */}
      <Text style={styles.text}>x: {acceleration.x?.toFixed(2)}</Text>
      <Text style={styles.text}>y: {acceleration.y?.toFixed(2)}</Text>
      <Text style={styles.text}>z: {acceleration.z?.toFixed(2)}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={subscription ? _unsubscribe : _subscribe} style={styles.button}>
          <Text>{subscription ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={_slow} style={[styles.button, styles.middleButton]}>
          <Text>Slow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={_fast} style={styles.button}>
          <Text>Fast</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    // borderColor: 'red',
    borderWidth: 3,
    margin: 0,
  },
  text: {
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // marginTop: 15,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    padding: 10,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
});
