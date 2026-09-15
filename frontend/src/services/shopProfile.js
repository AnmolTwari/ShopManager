const SHOP_PROFILE_KEY = 'shopmanager_shop_profile'

const DEFAULT_PROFILE = {
  shopName: 'ShopManager Store',
  phone: '',
  address: '',
  tagline: '',
  gstNumber: '',
}

let memoryShopProfile = null

export const shopProfileService = {
  getProfile() {
    if (memoryShopProfile !== null) {
      return memoryShopProfile
    }
    try {
      const raw = localStorage.getItem(SHOP_PROFILE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          memoryShopProfile = { ...DEFAULT_PROFILE, ...parsed }
          return memoryShopProfile
        }
      }
    } catch (e) {
      console.warn('Failed to read shop profile from storage:', e)
    }
    memoryShopProfile = { ...DEFAULT_PROFILE }
    return memoryShopProfile
  },

  saveProfile(profile) {
    const next = { ...DEFAULT_PROFILE, ...this.getProfile(), ...profile }
    memoryShopProfile = next
    try {
      localStorage.setItem(SHOP_PROFILE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('shopmanager_profile_updated', { detail: next }))
    } catch (e) {
      console.warn('Failed to save shop profile:', e)
    }
    return next
  },
}
