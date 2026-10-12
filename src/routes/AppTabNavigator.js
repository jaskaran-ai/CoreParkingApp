import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import React from 'react';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {COLORS} from '../constants';
//Screens
import {Account, Dashboard, Outs, Vehicles} from '../pages';
import AppTabStackNavigator from './AppTabStackNavigator';
//Create object for navigation
import navigation from './rootNavigator';

const Tab = createBottomTabNavigator();

export default function AppTabNavigator() {
  function drawerButton(color, size) {
    return (
      <TouchableOpacity
        onPress={() => {
          navigation.openDrawer();
        }}
        style={{
          paddingHorizontal: 20,
        }}>
        <Icon
          name="align-left"
          type="font-awesome-5"
          size={size}
          color={color}
        />
      </TouchableOpacity>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Home"
      allowFontScaling={false}
      animationEnabled
      screenOptions={{
        tabBarStyle: {
          position: 'absolute',
          height: 60,
          paddingBottom: 5,
          elevation: 0,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: {height: 0, width: 0},
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 0,
          marginTop: 0,
        },
        allowFontScaling: false,
        animationEnabled: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#bababa',
        showLabel: true,
        tabBarHideOnKeyboard: true,
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: COLORS.white,
          elevation: 0,
        },
        headerTitleStyle: {
          color: COLORS.primary,
          fontWeight: 'bold',
        },
        headerTintColor: COLORS.primary,
        headerLeft: () => {
          return drawerButton(COLORS.primary, 20);
        },
      }}>
      <Tab.Screen
        name="In"
        component={Dashboard}
        options={{
          tabBarIcon: function ({size, color}) {
            return <Icon name="arrow-down" size={size * 1.2} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Outs"
        component={Outs}
        options={{
          unmountOnBlur: true,
          tabBarIcon: function ({size, color}) {
            return <Icon name="arrow-up" size={size * 1.2} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Parked"
        component={Vehicles}
        options={{
          title: 'Available Vehicles',
          tabBarLabel: 'Parked',
          tabBarIcon: function ({size, color}) {
            return <Icon name="car" size={size * 1.1} color={color} />;
          },
        }}
      />

      <Tab.Screen
        name="Account"
        component={Account}
        options={{
          tabBarIcon: function ({size, color}) {
            return <Icon name="user" size={size * 1.2} color={color} />;
          },
        }}
      />
    </Tab.Navigator>
  );
}
