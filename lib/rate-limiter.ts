export class RateLimiter {
  private points: number
  private maxPoints: number
  private restoreRate: number
  private lastRestored: number

  constructor(isPlus: boolean = false) {
    this.maxPoints = isPlus ? 500 : 50
    this.restoreRate = isPlus ? 100 : 50
    this.points = this.maxPoints
    this.lastRestored = Date.now()
  }

  async waitIfNeeded(cost: number): Promise<void> {
    this.restore()
    
    if (this.points < cost) {
      const waitTime = Math.ceil((cost - this.points) / this.restoreRate * 1000)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.restore()
    }
    
    this.points -= cost
  }

  private restore() {
    const now = Date.now()
    const secondsPassed = (now - this.lastRestored) / 1000
    const pointsToRestore = Math.floor(secondsPassed * this.restoreRate)
    
    if (pointsToRestore > 0) {
      this.points = Math.min(this.maxPoints, this.points + pointsToRestore)
      this.lastRestored = now
    }
  }
}