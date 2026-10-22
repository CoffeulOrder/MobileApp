/**
 * 로컬 key-value 저장소.
 *
 * 스펙은 MMKV(또는 AsyncStorage) 였는데, MMKV 는 네이티브 모듈이라 Expo Go 에서 돌지 않고
 * 개발 빌드가 필요하다. 지금은 Expo Go 에 포함된 AsyncStorage 를 쓰고, 이 파일 하나만 바꾸면
 * MMKV 로 교체할 수 있도록 감싸 둔다 (호출하는 쪽은 전부 비동기 API 가정).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const kv = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiGet: (keys: string[]) => AsyncStorage.multiGet(keys),
  /** 여러 키를 한 번의 네이티브 호출로 저장 (iOS/Android 에서 한 배치로 기록됨) */
  multiSet: (entries: [string, string][]) => AsyncStorage.multiSet(entries),
  multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
};
