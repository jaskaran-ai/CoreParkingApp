import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';

import AuthContext from '../../auth/Context';
import {Button, InputComponent} from '../../components';
import {COLORS, FONTS, images, responsiveHeight, SIZES} from '../../constants';
import Layout from '../Layout';
import api from '../../api/auth';

export default function index({navigation}) {
  //Deceleration Of Context
  const authContext = React.useContext(AuthContext);
  const [emailOrMobile, setEmailOrMobile] = React.useState('9653338547');
  const [password, setPassword] = React.useState('123456');
  const [buttonLoading, setButtonLoading] = React.useState(false);

  function loginUser() {
    api
      .signIn(emailOrMobile, password)
      .then(res => {
        const user = res.data?.data?.user;
        if (res.status === 200 && user) {
          ToastAndroid.showWithGravity(
            res.data?.data?.message || 'Login successful',
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM,
          );
          authContext.setUser(user);
          setButtonLoading(false);
        } else {
          setButtonLoading(false);
          ToastAndroid.showWithGravity(
            res.data?.error?.message ||
              res.data?.message ||
              'Invalid login details',
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM,
          );
        }
      })
      .catch(err => {
        ToastAndroid.showWithGravity(
          err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            'Login failed',
          ToastAndroid.SHORT,
          ToastAndroid.BOTTOM,
        );
        setButtonLoading(false);
      });
  }

  //Component Renders
  function renderButtons() {
    return (
      <View style={styles.center}>
        {/* button for signIn  */}
        <Button
          height={responsiveHeight(6)}
          width="100%"
          title="Login"
          titleColor="white"
          backgroundColor={COLORS.primary}
          loading={buttonLoading}
          onPress={() => {
            setButtonLoading(true);
            if (emailOrMobile === '' || password === '') {
              ToastAndroid.showWithGravity(
                'Please fill all the fields',
                ToastAndroid.SHORT,
                ToastAndroid.CENTER,
              );
              setButtonLoading(false);
            } else {
              loginUser();
            }
          }}
        />
      </View>
    );
  }

  function renderSignText() {
    return (
      <View
        style={{
          paddingBottom: SIZES.padding * 2,
          marginBottom: 20,
          marginTop: 25,
        }}>
        <Text style={styles.welcome}>Login In</Text>
        <Text style={styles.loremIpsum}>Hi there! Nice to see you</Text>
      </View>
    );
  }

  function renderLogo() {
    return (
      <View style={styles.center}>
        {/* Logo */}
        <Image source={images.logo} resizeMode="contain" style={styles.logo} />
      </View>
    );
  }

  function renderInputFields() {
    return (
      <View behavior="position" style={{paddingBottom: SIZES.padding * 2}}>
        {/* emailOrMobile */}
        <InputComponent
          placeholder="Mobile/Email"
          label="Mobile/Email"
          required
          leftIcon="phone"
          value={emailOrMobile}
          onChangeText={value => {
            console.log(value);
            setEmailOrMobile(value);
          }}
        />

        {/* Password */}
        <InputComponent
          placeholder="Password"
          label="Password"
          leftIcon="lock"
          isPassword={true}
          value={password}
          required
          onChangeText={value => {
            console.log(value);
            setPassword(value);
          }}
        />
      </View>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        {/* Logo */}
        {renderLogo()}
        <ScrollView>
          {/* Sign Text */}
          {renderSignText()}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Text Input */}
            {renderInputFields()}

            {/* buttons */}
            {renderButtons()}
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZES.padding * 3,
    paddingTop: SIZES.padding * 2,
  },
  welcome: {
    ...FONTS.h2,
    color: COLORS.primary,
    opacity: 0.85,
    fontWeight: 'bold',
  },
  loremIpsum: {
    ...FONTS.h5,
    color: COLORS.darkgray,
    opacity: 0.8,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 250,
    width: 250,
  },
});
