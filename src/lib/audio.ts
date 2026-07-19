class BgmManager {
  private current: HTMLAudioElement | null = null
  private currentSrc = ''
  private baseVolume = 0.35
  private lastVolume = 0.35  // 静音前的音量，用于恢复

  /** 切换背景音乐（自动循环），相同曲目不重复加载 */
  play(src: string, volume = this.baseVolume) {
    if (this.currentSrc === src && this.current && !this.current.paused) return
    this.stop()
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = volume
    audio.play().catch(() => {})
    this.current = audio
    this.currentSrc = src
  }

  /** 停止当前 BGM */
  stop() {
    if (this.current) {
      this.current.pause()
      this.current.currentTime = 0
      this.current = null
      this.currentSrc = ''
    }
  }

  /** 设置音量（0-1）。如果非零则同时记住为恢复音量 */
  volume(value: number) {
    const v = Math.max(0, Math.min(1, value))
    if (v > 0) this.lastVolume = v
    this.baseVolume = v
    if (this.current) this.current.volume = v
  }

  /** 获取当前基础音量 */
  getVolume() { return this.baseVolume }
  /** 获取静音前的音量，用于恢复 */
  getLastVolume() { return this.lastVolume }
}

export const bgm = new BgmManager()
