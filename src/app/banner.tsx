import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { C, Radius, S } from '@/constants/coffeul';
import { useBanners } from '@/hooks/use-banners';

/**
 * 이벤트 팝업 (transparentModal). 메뉴 화면이 `useBanners().show()` 후 이 화면으로 보낸다.
 * 닫는 방법: [닫기] / 바깥(어두운 영역) 탭 / 안드로이드 뒤로가기 = 모두 "닫기".
 * [오늘 하루 보지 않기] 는 오늘 자정까지 이 배너를 숨긴다.
 */
export default function BannerPopup() {
  const banners = useBanners();
  const { width } = useWindowDimensions();
  // 닫는 순간 context 의 active 가 비워져도 화면이 깜빡이거나 Redirect 되지 않도록 처음 값을 붙잡아 둔다
  const [banner] = useState(() => banners.active);

  // 뒤로가기 등으로 사라지는 경우에도 상태를 정리
  useEffect(() => banners.clearActive, [banners.clearActive]);

  if (!banner) return <Redirect href="/menu" />; // 직접 접근/새로고침 등 표시할 배너가 없는 경우

  const cardW = Math.min(width - S.xl * 2, 340);

  const finish = async (how: 'close' | 'hide_today') => {
    await banners.close(how);
    router.back();
  };

  const open = async () => {
    const link = banner.link;
    if (!link) return;
    await banners.close('open');
    router.back();
    if (link.type === 'route') router.push(link.path);
    else await WebBrowser.openBrowserAsync(link.url);
  };

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={() => finish('close')}
        accessibilityLabel="팝업 닫기"
      />
      <View style={[styles.card, { width: cardW }]}>
        <Pressable
          onPress={open}
          disabled={!banner.link}
          accessibilityRole={banner.link ? 'imagebutton' : 'image'}
          accessibilityLabel={banner.title}>
          <Image
            source={{ uri: banner.imageUrl }}
            style={{ width: cardW, aspectRatio: 4 / 5 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => finish('hide_today')}>
            <Text style={styles.actionText}>오늘 하루 보지 않기</Text>
          </Pressable>
          <View style={styles.sep} />
          <Pressable style={styles.action} onPress={() => finish('close')}>
            <Text style={[styles.actionText, styles.actionStrong]}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.6)',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(17,24,39,0.3)',
  },
  actions: { flexDirection: 'row', alignItems: 'stretch' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: S.lg },
  actionText: { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
  actionStrong: { color: C.text },
  sep: { width: 1, backgroundColor: C.border },
});
