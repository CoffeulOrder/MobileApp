import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C } from '@/constants/coffeul';
import { BannerProvider } from '@/hooks/use-banners';
import { CartProvider } from '@/hooks/use-cart';
import { MenuProvider } from '@/hooks/use-menu';
import { ProfileProvider } from '@/hooks/use-profile';
import { SchoolProvider } from '@/hooks/use-school';
import { VoucherProvider } from '@/hooks/use-vouchers';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <SchoolProvider>
        <MenuProvider>
          <VoucherProvider>
          <ProfileProvider>
          <BannerProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: C.bg },
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="branch" />
              <Stack.Screen name="menu" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="order-complete" />
              <Stack.Screen name="payment-methods" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="coupons" />
              <Stack.Screen name="nickname" />
              <Stack.Screen
                name="banner"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
              <Stack.Screen
                name="cart"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack>
          </CartProvider>
          </BannerProvider>
          </ProfileProvider>
          </VoucherProvider>
        </MenuProvider>
      </SchoolProvider>
    </SafeAreaProvider>
  );
}
