import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Button } from 'react-native';

export default function ButtonInput() {

  return (
    <View style={styles.buttonLayout}>
      <View style={styles.upDown}>
        <Button title='Up'></Button>
      </View>
      <View style={styles.middle}>
        <View style={styles.left}>
          <Button title='Left'></Button>
        </View>
        <View style={styles.right}>
          <Button title='Right'></Button>
        </View>
      </View>
      <View style={styles.upDown}>
        <Button title='Down'></Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonLayout: {
    justifyContent: 'center',
    borderWidth: 3,
    margin: 10,
  },
  upDown: {
    width: "auto",
    alignSelf: "center",
    borderWidth: 3,
    margin: 10,
    
  },
  middle: {
    justifyContent: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
  },
  left: {
    borderWidth: 3,
    marginRight: 5,
  },
  right: {
    borderWidth: 3,
    marginLeft: 5,
  },
});