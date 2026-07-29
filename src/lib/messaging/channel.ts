/**
 * Messaging channel abstraction (spec §5.3 / §8.6).
 *
 * Puts every SMS provider behind one interface so the default can move from the
 * hard-coded SmartSMS path to Africa's Talking (the spec's intended primary for
 * SMS/USSD/Voice) by configuration alone. SmartSMS remains the default and its
 * existing behavior is untouched — SmartSmsAdapter simply wraps sendSMS().
 *
 * The Africa's Talking adapter is an intentional, env-gated skeleton: live HTTP
 * wiring needs an AT account, so it fails loudly rather than pretending to send.
 * The registry/selection logic is pure and unit-tested.
 */
import { sendSMS } from "@/lib/sms"

export type OutboundSms = { to: string; message: string; sender?: string }
export type ChannelResult = { success: boolean; message: string; provider: string }

export interface SmsChannelAdapter {
  readonly name: string
  /** Whether required credentials/config are present for this provider. */
  isConfigured(): boolean
  send(msg: OutboundSms): Promise<ChannelResult>
}

/** Injectable SMS-send function (defaults to the real SmartSMS sendSMS). */
type SmsSender = (o: OutboundSms) => Promise<{ success: boolean; message: string }>

/** Default provider: the existing SmartSMS integration, unchanged. */
export class SmartSmsAdapter implements SmsChannelAdapter {
  readonly name = "smartsms"
  constructor(private readonly sender: SmsSender = sendSMS) {}

  isConfigured(): boolean {
    return Boolean(process.env.SMARTSMS_API_KEY)
  }

  async send(msg: OutboundSms): Promise<ChannelResult> {
    const r = await this.sender(msg)
    return { success: r.success, message: r.message, provider: this.name }
  }
}

export type AfricasTalkingConfig = { username?: string; apiKey?: string; senderId?: string }

/**
 * Africa's Talking adapter — skeleton. Reports configuration state and fails
 * loudly if selected without credentials or before the live wiring lands.
 */
export class AfricasTalkingAdapter implements SmsChannelAdapter {
  readonly name = "africastalking"
  private readonly cfg: AfricasTalkingConfig

  constructor(cfg?: AfricasTalkingConfig) {
    this.cfg = cfg ?? {
      username: process.env.AFRICASTALKING_USERNAME,
      apiKey: process.env.AFRICASTALKING_API_KEY,
      senderId: process.env.AFRICASTALKING_SENDER_ID,
    }
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.username && this.cfg.apiKey)
  }

  async send(_msg: OutboundSms): Promise<ChannelResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Africa's Talking adapter is not configured: set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY",
      )
    }
    // Live HTTP wiring is intentionally deferred (requires an AT account + USSD/
    // Voice callback setup). Fail loudly rather than silently dropping messages.
    throw new Error(
      "Africa's Talking send is not implemented yet (pilot skeleton). Use SMS_PROVIDER=smartsms until wired.",
    )
  }
}

/**
 * Resolve the configured SMS channel adapter. Selection is by the SMS_PROVIDER
 * env var (default "smartsms"); an unknown value falls back to SmartSMS so a
 * misconfiguration never disables messaging.
 */
export function resolveSmsChannel(
  provider: string | undefined = process.env.SMS_PROVIDER,
): SmsChannelAdapter {
  switch ((provider || "smartsms").toLowerCase()) {
    case "africastalking":
      return new AfricasTalkingAdapter()
    case "smartsms":
    default:
      return new SmartSmsAdapter()
  }
}

/** Send an SMS via the configured channel. */
export async function sendViaChannel(msg: OutboundSms): Promise<ChannelResult> {
  return resolveSmsChannel().send(msg)
}
