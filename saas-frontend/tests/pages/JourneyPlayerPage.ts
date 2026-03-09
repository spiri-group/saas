import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Journey Player Page Object Model
 * Handles the /u/[userId]/space/journeys/[journeyId] page (audio player)
 */
export class JourneyPlayerPage extends BasePage {
  private readonly selectors = {
    // Page states
    loading: '[data-testid="player-loading"]',
    errorState: '[data-testid="player-error"]',
    playerPage: '[data-testid="journey-player-page"]',

    // Navigation
    backToJourneys: '[data-testid="back-to-journeys"]',

    // Now playing
    albumArt: '[data-testid="album-art"]',
    nowPlayingTitle: '[data-testid="now-playing-title"]',
    nowPlayingJourney: '[data-testid="now-playing-journey"]',
    journeyIntention: '[data-testid="journey-intention"]',

    // Playback controls
    playPauseBtn: '[data-testid="play-pause-btn"]',
    prevTrackBtn: '[data-testid="prev-track-btn"]',
    nextTrackBtn: '[data-testid="next-track-btn"]',
    seekBar: '[data-testid="audio-seek-bar"]',
    currentTime: '[data-testid="current-time"]',
    totalTime: '[data-testid="total-time"]',

    // Track list
    trackList: '[data-testid="track-list"]',
    trackItem: '[data-testid^="track-item-"]',
    playingIndicator: '[data-testid="playing-indicator"]',

    // Reflection
    reflectionSection: '[data-testid="reflection-section"]',
    reflectionTextarea: '[data-testid="reflection-textarea"]',
    saveReflectionBtn: '[data-testid="save-reflection-btn"]',
    savedReflection: '[data-testid="saved-reflection"]',
    continueNextBtn: '[data-testid="continue-next-btn"]',

    // Crystals
    trackCrystals: '[data-testid="track-crystals"]',
    journeyCrystals: '[data-testid="journey-crystals"]',

    // Rental
    rentalBanner: '[data-testid="rental-banner"]',
    rentalExpiredPage: '[data-testid="journey-rental-expired"]',
    repurchaseBtn: '[data-testid="repurchase-btn"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(userId: string, journeyId: string) {
    await this.page.goto(`/u/${userId}/space/journeys/${journeyId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    // Wait for loading to finish first
    const loading = this.page.locator(this.selectors.loading);
    await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    const playerPage = this.page.locator(this.selectors.playerPage);
    const errorState = this.page.locator(this.selectors.errorState);
    await expect(playerPage.or(errorState)).toBeVisible({ timeout: 30000 });
  }

  async isPlayerVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.playerPage).isVisible();
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.errorState).isVisible();
  }

  // Navigation
  async clickBackToJourneys() {
    await this.page.locator(this.selectors.backToJourneys).click();
  }

  // Now Playing
  async getNowPlayingTitle(): Promise<string> {
    return await this.page.locator(this.selectors.nowPlayingTitle).textContent() || '';
  }

  async getJourneyName(): Promise<string> {
    return await this.page.locator(this.selectors.nowPlayingJourney).textContent() || '';
  }

  async isAlbumArtVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.albumArt).isVisible();
  }

  async isIntentionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.journeyIntention).isVisible();
  }

  // Playback Controls
  async clickPlayPause() {
    await this.page.locator(this.selectors.playPauseBtn).click();
  }

  async isPlayPauseEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.playPauseBtn).isEnabled();
  }

  async clickPrevTrack() {
    await this.page.locator(this.selectors.prevTrackBtn).click();
  }

  async isPrevTrackEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.prevTrackBtn).isEnabled();
  }

  async clickNextTrack() {
    await this.page.locator(this.selectors.nextTrackBtn).click();
  }

  async isNextTrackEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.nextTrackBtn).isEnabled();
  }

  async getCurrentTime(): Promise<string> {
    return await this.page.locator(this.selectors.currentTime).textContent() || '';
  }

  async getTotalTime(): Promise<string> {
    return await this.page.locator(this.selectors.totalTime).textContent() || '';
  }

  async isSeekBarVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.seekBar).isVisible();
  }

  // Track List
  async getTrackCount(): Promise<number> {
    return await this.page.locator(this.selectors.trackItem).count();
  }

  async clickTrack(trackId: string) {
    await this.page.locator(`[data-testid="track-item-${trackId}"]`).click();
  }

  async clickTrackByIndex(index: number) {
    await this.page.locator(this.selectors.trackItem).nth(index).click();
  }

  async isPlayingIndicatorVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.playingIndicator).isVisible();
  }

  // Reflection
  async isReflectionSectionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.reflectionSection).isVisible();
  }

  async writeReflection(text: string) {
    await this.page.locator(this.selectors.reflectionTextarea).fill(text);
  }

  async clickSaveReflection() {
    await this.page.locator(this.selectors.saveReflectionBtn).click();
  }

  async isSaveReflectionEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.saveReflectionBtn).isEnabled();
  }

  async hasSavedReflection(): Promise<boolean> {
    return await this.page.locator(this.selectors.savedReflection).isVisible();
  }

  async clickContinueToNext() {
    await this.page.locator(this.selectors.continueNextBtn).click();
  }

  // Crystals
  async hasTrackCrystals(): Promise<boolean> {
    return await this.page.locator(this.selectors.trackCrystals).isVisible();
  }

  async hasJourneyCrystals(): Promise<boolean> {
    return await this.page.locator(this.selectors.journeyCrystals).isVisible();
  }

  // Rental
  async isRentalBannerVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.rentalBanner).isVisible();
  }

  async getRentalBannerText(): Promise<string> {
    return await this.page.locator(this.selectors.rentalBanner).textContent() || '';
  }

  async isRentalExpiredPageVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.rentalExpiredPage).isVisible();
  }

  async isRepurchaseButtonVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.repurchaseBtn).isVisible();
  }

  async clickRepurchase() {
    await this.page.locator(this.selectors.repurchaseBtn).click();
  }

  async waitForPlayerOrExpired() {
    const playerPage = this.page.locator(this.selectors.playerPage);
    const expiredPage = this.page.locator(this.selectors.rentalExpiredPage);
    const errorState = this.page.locator(this.selectors.errorState);
    await expect(playerPage.or(expiredPage).or(errorState)).toBeVisible({ timeout: 30000 });
  }
}
