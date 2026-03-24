'use client'

import React, { useState, useEffect, useRef } from 'react'
import SalonLogo from '@/app/components/SalonLogo'
import { THEMES, ThemeKey } from '@/app/lib/themes'

function toEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('/maps/embed')) return url
  const coord = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (coord) return `https://www.google.com/maps?q=${coord[1]},${coord[2]}&output=embed`
  try {
    const u = new URL(url)
    u.searchParams.set('output', 'embed')
    return u.toString()
  } catch { return url }
}

interface Barber { id: string; name: string }
interface Service { id: string; name_ar: string; price: number; duration_min: number }
interface Props {
  salon: { id: string; name: string; whatsapp_number: string | null; city: string | null; working_hours?: string | null; meta?: { hero_title?: string; tagline?: string; neighborhood?: string; hero_image?: string; feature_image?: string; map_url?: string; map_embed_url?: string; map_place_url?: string; card_theme?: string; custom_color?: string; features?: { title: string; description: string }[]; features_title?: string; features_subtitle?: string; about_title?: string; about_description?: string; years_experience?: number; rating?: number; happy_clients?: number; reviews_title?: string; reviews_subtitle?: string; reviews?: { name: string; text: string }[]; offers?:{ id: string; title: string; badge?: string; description?: string; price_current?: string; price_old?: string; is_active: boolean; service_ids?: string[] }[]; page_theme?: string; page_primary_color?: string; page_bg_color?: string; booking_button_hero_text?: string } | null }
  barbers: Barber[]
  services: Service[]
  slug: string
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function formatArabicTimeRange(range: string) {
  return range.split('–').map(t => {
    const [hStr, mStr = '00'] = t.trim().split(':')
    const h = parseInt(hStr, 10)
    const h12 = h % 12 || 12
    const suffix = h < 12 ? 'ص' : 'م'
    return `${pad2(h12)}:${mStr} ${suffix}`
  }).join(' – ')
}
function toArabicTimeLabel(h24: number, min: number) {
  const suffix = h24 < 12 ? 'صباحاً' : 'مساءً'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${pad2(min)} ${suffix}`
}
const SB_URL = 'https://vkemzfyenxxbjwferyms.supabase.co'
const SB_KEY = 'sb_publishable_3T-Bz6_RheK-wikV9kO9jg_-rjQ0gua'
const TENANT_ID = '4619cc68-fc96-4fec-bee7-bb4046b0fc1a'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
  :root { color-scheme: dark; --gold: var(--primary); --gold-light: var(--primary); --gold-dark: var(--primary); --hero-image: url('/hero.jpg'); }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
  }
  .btn-gold { background: linear-gradient(135deg, var(--primary) 0%, rgba(var(--primary-rgb),.72) 100%); color: var(--btn-text); box-shadow: 0 4px 20px rgba(0,0,0,.35),0 8px 32px rgba(0,0,0,.4); transition: transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s cubic-bezier(.4,0,.2,1),filter .25s ease; position: relative; overflow: hidden; }
  .btn-gold::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.22) 0%,transparent 55%); opacity:0; transition:opacity .25s ease; }
  .btn-gold:hover { transform:translateY(-2px); box-shadow:0 0 0 1px rgba(var(--primary-rgb),.55),0 0 32px rgba(var(--primary-rgb),.3),0 12px 44px rgba(0,0,0,.5); filter:brightness(1.06); }
  .btn-gold:hover::after { opacity:1; }
  .btn-gold:active { transform:translateY(0); }
  .card,.glass-card { background:var(--card-bg); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.05); box-shadow:var(--card-shadow); position:relative; overflow:hidden; }
  .glass-card { transition:transform .35s cubic-bezier(.4,0,.2,1),box-shadow .35s cubic-bezier(.4,0,.2,1),border-color .35s ease,background .35s ease; }
  .glass-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--gold),transparent); opacity:0; transition:opacity .35s ease; }
  .glass-card:hover { background:rgba(255,255,255,.07); border-color:rgba(var(--primary-rgb),.28); transform:translateY(-5px); box-shadow:var(--card-shadow),0 0 0 1px rgba(var(--primary-rgb),.15),0 24px 64px rgba(0,0,0,.18); }
  .glass-card:hover::before { opacity:1; }
  .reveal { opacity:0; transform:translateY(24px); transition:opacity .9s cubic-bezier(.4,0,.2,1),transform .9s cubic-bezier(.4,0,.2,1); }
  .reveal.visible { opacity:1; transform:translateY(0); }
  .reveal-d1{transition-delay:.1s}.reveal-d2{transition-delay:.2s}.reveal-d3{transition-delay:.3s}.reveal-d4{transition-delay:.45s}
  .sec-label { display:inline-flex; align-items:center; gap:8px; font-size:.7rem; font-weight:700; letter-spacing:.14em; color:var(--gold); text-transform:uppercase; margin-bottom:.6rem; }
  .sec-label::before { content:''; display:inline-block; width:22px; height:1px; background:var(--gold); }
  #siteHeader { transition:background .4s ease,border-color .4s ease,box-shadow .4s ease,backdrop-filter .4s ease; }
  #siteHeader.scrolled { background:rgba(0,0,0,.88)!important; border-color:rgba(var(--primary-rgb),.2)!important; box-shadow:0 4px 32px rgba(0,0,0,.45); backdrop-filter:blur(24px); }
  .headline-gold { background:linear-gradient(120deg,#fff 0%,var(--primary) 45%,var(--primary) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  .float-anim { animation:floatY 4s ease-in-out infinite; }
  @keyframes scrollBounce { 0%,100%{transform:translateY(0) translateX(-50%);opacity:.4} 50%{transform:translateY(6px) translateX(-50%);opacity:.9} }
  .scroll-dot { animation:scrollBounce 2s ease-in-out infinite; }
  .star-pop{display:inline-block;animation:starIn .4s ease both}
  .star-pop:nth-child(1){animation-delay:.05s}.star-pop:nth-child(2){animation-delay:.12s}.star-pop:nth-child(3){animation-delay:.19s}.star-pop:nth-child(4){animation-delay:.26s}.star-pop:nth-child(5){animation-delay:.33s}
  @keyframes starIn{from{opacity:0;transform:scale(.4) rotate(-20deg)}to{opacity:1;transform:scale(1) rotate(0deg)}}
  .field-input:focus { border-color:rgba(var(--primary-rgb),.65)!important; box-shadow:0 0 0 3px rgba(var(--primary-rgb),.14)!important; outline:none; }
  #heroBg { will-change:transform; }

  .text-gold{color:var(--primary)}
  .border-gold\\/10{border-color:rgba(var(--primary-rgb),.10)}.border-gold\\/15{border-color:rgba(var(--primary-rgb),.15)}.border-gold\\/20{border-color:rgba(var(--primary-rgb),.20)}.border-gold\\/22{border-color:rgba(var(--primary-rgb),.22)}.border-gold\\/25{border-color:rgba(var(--primary-rgb),.25)}.border-gold\\/28{border-color:rgba(var(--primary-rgb),.28)}.border-gold\\/30{border-color:rgba(var(--primary-rgb),.30)}.border-gold\\/40{border-color:rgba(var(--primary-rgb),.40)}.border-gold\\/55{border-color:rgba(var(--primary-rgb),.55)}
  .bg-gold\\/5{background-color:rgba(var(--primary-rgb),.05)}.bg-gold\\/6{background-color:rgba(var(--primary-rgb),.06)}.bg-gold\\/7{background-color:rgba(var(--primary-rgb),.07)}.bg-gold\\/8{background-color:rgba(var(--primary-rgb),.08)}.bg-gold\\/10{background-color:rgba(var(--primary-rgb),.10)}.bg-gold\\/12{background-color:rgba(var(--primary-rgb),.12)}.bg-gold\\/25{background-color:rgba(var(--primary-rgb),.25)}
  .hover\\:text-gold:hover{color:var(--primary)}.hover\\:border-gold\\/25:hover{border-color:rgba(var(--primary-rgb),.25)}.hover\\:border-gold\\/30:hover{border-color:rgba(var(--primary-rgb),.30)}.hover\\:border-gold\\/40:hover{border-color:rgba(var(--primary-rgb),.40)}.hover\\:border-gold\\/55:hover{border-color:rgba(var(--primary-rgb),.55)}.hover\\:bg-gold\\/5:hover{background-color:rgba(var(--primary-rgb),.05)}
  .hover\\:bg-white\\/3:hover{background-color:rgba(255,255,255,.03)}.hover\\:bg-white\\/5:hover{background-color:rgba(255,255,255,.05)}.hover\\:bg-white\\/10:hover{background-color:rgba(255,255,255,.10)}
  .focus\\:ring-gold\\/60:focus{box-shadow:0 0 0 3px rgba(var(--primary-rgb),.60);outline:none}
  .shadow-glow{box-shadow:0 0 0 1px rgba(var(--primary-rgb),.28),0 18px 50px rgba(0,0,0,.55)}.shadow-glow-lg{box-shadow:0 0 0 1px rgba(var(--primary-rgb),.4),0 0 40px rgba(var(--primary-rgb),.2),0 24px 60px rgba(0,0,0,.6)}.shadow-soft{box-shadow:0 14px 45px rgba(0,0,0,.55)}
  .accent-\\[\\#C9A84C\\]{accent-color:var(--primary)}
  .t-primary{color:var(--text-primary)}.t-secondary{color:var(--text-secondary)}.t-muted{color:var(--text-muted)}
  .section-dark{background:var(--bg);position:relative}.section-light{background:var(--bg-alt);position:relative}
  .section-dark::before,.section-light::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--primary-rgb),.07),transparent);pointer-events:none;z-index:0}
  .bg-ink{background-color:#0D0F14}
  .nav-link{position:relative;padding-bottom:3px;}
  .nav-link::after{content:'';position:absolute;bottom:0;right:0;width:0;height:1.5px;background:var(--primary);border-radius:2px;transition:width .28s cubic-bezier(.4,0,.2,1);}
  .nav-link:hover::after{width:100%;}
  #siteHeader .header-glow{position:absolute;bottom:-1px;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--primary-rgb),.18),transparent);pointer-events:none;}
`

export default function SalonPage({ salon, barbers, services, slug }: Props) {
  const meta = salon.meta ?? {}
  const activeTheme = (() => {
    if (meta.page_theme === 'custom') {
      const base = THEMES.gold
      return {
        ...base,
        primary: (meta as any).page_primary_color ?? base.primary,
        bg:      (meta as any).page_bg_color      ?? base.bg,
      }
    }
    return THEMES[(meta.page_theme as ThemeKey) ?? 'gold'] ?? THEMES.gold
  })()

  const btnTextColor = (() => {
    const hex = activeTheme.primary.replace('#', '')
    if (!hex.match(/^[0-9a-fA-F]{6}$/)) return '#000000'
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000000' : '#ffffff'
  })()

  const isLightBg = (() => {
    const hex = activeTheme.bg.replace('#', '')
    if (!hex.match(/^[0-9a-fA-F]{6}$/)) return false
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55
  })()


  const primaryRgb = (() => {
    const hex = activeTheme.primary.replace('#', '')
    if (!hex.match(/^[0-9a-fA-F]{6}$/)) return '201,168,76'
    return `${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)}`
  })()

  const [bookingOpen, setBookingOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroBgRef = useRef<HTMLDivElement>(null)

  // form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('05')
  const [barber, setBarber] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [checkedServices, setCheckedServices] = useState<Set<string>>(new Set())
  const [timeOpts, setTimeOpts] = useState<{ value: string; label: string; booked: boolean }[]>([])
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = (() => { const n = new Date(); return `${n.getFullYear()}-${pad2(n.getMonth()+1)}-${pad2(n.getDate())}` })()

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50)
      if (heroBgRef.current) heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) } })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!bookingOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBookingOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bookingOpen])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', bookingOpen)
    return () => { document.body.classList.remove('overflow-hidden') }
  }, [bookingOpen])

  useEffect(() => {
    let cancelled = false
    async function fill() {
      if (!barber || !date) { if (!cancelled) setTimeOpts([]); return }
      const barberObj = barbers.find(b => b.name === barber)
      if (!barberObj) { if (!cancelled) setTimeOpts([]); return }
      try {
        const url = `/api/availability?barber_id=${barberObj.id}&date=${date}&duration=30&utcOffset=180&salon_id=${salon.id}`
        const res = await fetch(url)
        const json = await res.json()
        if (res.ok) {
          const slots: string[] = json.slots ?? []
          if (!cancelled) setTimeOpts(slots.map(s => {
            const [h, m] = s.split(':').map(Number)
            return { value: s, label: toArabicTimeLabel(h, m), booked: false }
          }))
        }
      } catch (err) { console.error('[availability] fetch error:', err); if (!cancelled) setTimeOpts([]) }
    }
    fill()
    return () => { cancelled = true }
  }, [barber, date, barbers])

  function openBooking(svc = '', brb = '') {
    setBookingOpen(true); setFormMsg(null)
    if (brb) setBarber(brb)
    if (svc) setCheckedServices(new Set([svc]))
  }

  function handlePhone(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '')
    if (!v.startsWith('05')) v = '05' + v.replace(/^0{0,1}5{0,1}/, '')
    if (v.length > 10) v = v.slice(0, 10)
    if (v.length < 2) v = '05'
    setPhone(v)
  }

  function toggleService(s: string) {
    setCheckedServices(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (checkedServices.size === 0) { setFormMsg({ text: 'يرجى اختيار خدمة واحدة على الأقل.', error: true }); return }
    if (!/^05\d{8}$/.test(phone)) { setFormMsg({ text: 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.', error: true }); return }
    const barberObj = barbers.find(b => b.name === barber)
    if (!barberObj) { setFormMsg({ text: 'يرجى اختيار الحلاق.', error: true }); return }
    const serviceObj = services.find(s => checkedServices.has(s.name_ar))
    if (!serviceObj) { setFormMsg({ text: 'يرجى اختيار خدمة.', error: true }); return }
    if (!date || !time) { setFormMsg({ text: 'يرجى اختيار التاريخ والوقت.', error: true }); return }
    const starts_at = new Date(`${date}T${time}:00+03:00`).toISOString()
    const ends_at = new Date(new Date(starts_at).getTime() + serviceObj.duration_min * 60 * 1000).toISOString()
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salon_id: salon.id, barber_id: barberObj.id, service_id: serviceObj.id, customer_name: name, customer_phone: phone, starts_at, ends_at }),
      })
      const json = await res.json()
      if (!res.ok) { setFormMsg({ text: json.error ?? 'حدث خطأ أثناء الحجز، يرجى المحاولة مرة أخرى.', error: true }); return }
      setFormMsg({ text: 'تم الحجز بنجاح! سنتواصل معك قريباً.', error: false })
      setName(''); setPhone('05'); setBarber(''); setDate(''); setTime(''); setCheckedServices(new Set())
    } catch { setFormMsg({ text: 'حدث خطأ أثناء الحجز، يرجى المحاولة مرة أخرى.', error: true }) }
    finally { setSubmitting(false) }
  }

  function handleWhatsApp() {
    const svcs = Array.from(checkedServices)
    if (svcs.length === 0) { setFormMsg({ text: 'يرجى اختيار خدمة واحدة على الأقل لإرسالها عبر واتساب.', error: true }); return }
    const parts = ['أرغب بحجز خدمة:', svcs.join(' + '), barber ? `الحلاق: ${barber}` : '', date ? `التاريخ: ${date}` : '', time ? `الوقت: ${time}` : '', `صالون ${salon.name}`].filter(Boolean).join('\n')
    const wa = salon.whatsapp_number
    window.open(wa ? `https://wa.me/${wa}?text=${encodeURIComponent(parts)}` : `https://wa.me/?text=${encodeURIComponent(parts)}`, '_blank', 'noopener,noreferrer')
  }

  const city = salon.city ?? 'الرياض'
  const workingHours = formatArabicTimeRange(salon.working_hours || '08:00–22:00')
  const tagline = salon.meta?.tagline || `مستوى جديد من العناية الرجالية في ${city} — تفاصيل دقيقة، أجواء راقية، بالحجز المسبق فقط.`
  const neighborhood = salon.meta?.neighborhood || city
  const heroImage = salon.meta?.hero_image || '/hero.jpg'
  const mapUrl = salon.meta?.map_url || null
  const mapHref = (() => {
    if (!mapUrl) return 'https://maps.google.com'
    const placeId = mapUrl.match(/!1s([^!]+)(?=!5e)/)?.[1]
    if (placeId) return `https://www.google.com/maps/place/?q=place_id:${placeId}`
    const lat = mapUrl.match(/!3d(-?\d+\.\d+)/)?.[1]
    const lng = mapUrl.match(/!2d(-?\d+\.\d+)/)?.[1]
    if (lat && lng) return `https://maps.google.com/?q=${lat},${lng}&ll=${lat},${lng}&z=19`
    return mapUrl.replace('maps/embed', 'maps')
  })()
  const featured = services.slice(0, 3)

  return (
    <div lang="ar" dir="rtl" style={{ fontFamily: "'Tajawal', ui-sans-serif, system-ui, sans-serif", backgroundColor: isLightBg ? activeTheme.bg : '#0D0F14', color: activeTheme.text, minHeight: '100vh', ['--primary' as string]: activeTheme.primary, ['--bg' as string]: isLightBg ? activeTheme.bg : '#0D0F14', ['--bg-alt' as string]: isLightBg ? activeTheme.bgAlt : '#111520', ['--text' as string]: isLightBg ? '#111111' : '#F0F2F8', ['--text-primary' as string]: isLightBg ? '#111111' : '#F0F2F8', ['--text-secondary' as string]: isLightBg ? '#555555' : 'rgba(240,242,248,0.72)', ['--text-muted' as string]: isLightBg ? '#666666' : 'rgba(240,242,248,0.45)', ['--card-bg' as string]: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', ['--card-shadow' as string]: isLightBg ? '0 2px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' : 'inset 0 0 40px rgba(var(--primary-rgb),.06)', ['--border' as string]: activeTheme.border, ['--btn-text' as string]: btnTextColor, ['--primary-rgb' as string]: primaryRgb }}>
      <style>{CSS}</style>

      {/* ── NAVBAR ── */}
      <header id="siteHeader" className={`fixed inset-x-0 top-0 z-50 border-b border-gold/15 backdrop-blur-xl${scrolled ? ' scrolled' : ''}`} style={{ background: isLightBg ? 'rgba(255,255,255,0.92)' : 'rgba(8,10,16,0.45)' }}>
        <div className="header-glow" aria-hidden="true" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-10">
          <a href="#home" className="inline-flex items-center transition-opacity duration-200 hover:opacity-85" style={{ gap: 10 }}>
            <SalonLogo logo_url={salon.meta?.logo_url} logo_letter={salon.meta?.logo_letter} size="sm" />
            <div className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{salon.name}</div>
          </a>

          <button onClick={() => setMobileOpen(o => !o)} className="inline-flex items-center justify-center rounded-xl border border-gold/20 bg-white/5 p-2.5 transition-all duration-200 hover:border-gold/40 hover:bg-white/10 active:scale-95 lg:hidden" style={{ color: 'var(--text-primary)' }} aria-label="فتح القائمة" aria-expanded={mobileOpen}>
            <span className="sr-only">القائمة</span>
            {mobileOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>

          <div className="hidden items-center gap-7 lg:flex">
            <a className="nav-link text-sm font-medium t-muted transition-colors duration-200 hover:text-gold" href="#home">الرئيسية</a>
            <a className="nav-link text-sm font-medium t-muted transition-colors duration-200 hover:text-gold" href="#services">الخدمات</a>
            <a className="nav-link text-sm font-medium t-muted transition-colors duration-200 hover:text-gold" href="#why-us">المعرض</a>
            <a className="nav-link text-sm font-medium t-muted transition-colors duration-200 hover:text-gold" href="#reviews">التقييمات</a>
            <a className="nav-link text-sm font-medium t-muted transition-colors duration-200 hover:text-gold" href="#location">الموقع</a>
            <button type="button" onClick={() => openBooking()} className="btn-gold rounded-xl px-5 py-2.5 text-sm font-bold focus:outline-none focus:ring-gold/60 focus:ring-offset-2 focus:ring-offset-black">احجز الآن</button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="border-t border-gold/15 lg:hidden" style={{ background: 'rgba(6,8,14,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
            <div className="mx-auto grid max-w-6xl gap-0.5 px-4 py-3 pb-4">
              {['#home:الرئيسية','#services:الخدمات والأسعار','#why-us:المعرض','#reviews:التقييمات','#location:الموقع'].map(item => {
                const [href, label] = item.split(':')
                return (
                  <a key={href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium t-secondary transition-all duration-200 hover:bg-white/5 hover:text-gold hover:pr-5" href={href} onClick={() => setMobileOpen(false)}>
                    <span className="h-px w-3 flex-shrink-0" style={{ background: 'rgba(var(--primary-rgb),0.4)' }} aria-hidden="true" />
                    {label}
                  </a>
                )
              })}
              <button type="button" onClick={() => { openBooking(); setMobileOpen(false) }} className="btn-gold mt-3 rounded-xl px-4 py-3 text-sm font-bold">احجز الآن</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── HERO ── */}
        <section id="home" className="relative isolate scroll-mt-24 overflow-hidden flex items-center" style={{ minHeight: '100vh' }} aria-label="القسم الرئيسي">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div ref={heroBgRef} id="heroBg" className="absolute inset-[-10%]" style={{ backgroundImage: `url('${heroImage}')`, backgroundSize: 'cover', backgroundPosition: 'center center' }} />
            <div className="absolute inset-0" style={{ background: isLightBg ? 'linear-gradient(160deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.68) 100%)' : 'linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(13,15,20,0.35) 55%, rgba(13,15,20,0.72) 100%)' }} />
          </div>

          <div className="mx-auto w-full max-w-7xl px-6 lg:px-12" style={{ paddingTop: '140px', paddingBottom: '120px' }}>
            <div className="flex flex-col" style={{ gap: '36px' }}>
              {/* Title */}
              <h1 className="reveal text-3xl font-black leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-6xl" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.55)', marginBottom: '0' }}>
                {salon.meta?.hero_title ? (
                  <span className="block" style={{ color: 'var(--primary)', letterSpacing: '-0.03em' }}>{salon.meta.hero_title}</span>
                ) : (
                  <>
                    <span className="block" style={{ color: '#ffffff', fontWeight: 900 }}>العناية المثالية</span>
                    <span className="headline-gold block" style={{ marginTop: '6px', fontWeight: 900 }}>للحلاقة الفاخرة</span>
                  </>
                )}
              </h1>
              {/* Subtitle */}
              <p className="reveal reveal-d1 max-w-md text-base font-semibold sm:text-lg" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: '1.8', letterSpacing: '0.015em', textShadow: '0 2px 12px rgba(0,0,0,0.65)' }}>{tagline}</p>
              {/* CTAs */}
              <div className="reveal reveal-d2">
                <button type="button" onClick={() => openBooking()} className="rounded-2xl px-8 py-3.5 text-sm font-extrabold text-black sm:px-10 sm:py-4 sm:text-base focus:outline-none" style={{ background: `linear-gradient(135deg, var(--primary) 0%, rgba(${primaryRgb},.72) 100%)`, color: btnTextColor, boxShadow: '0 4px 20px rgba(0,0,0,0.35)', transition: 'transform 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.03)'; (e.currentTarget as HTMLElement).style.filter='brightness(1.1)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; (e.currentTarget as HTMLElement).style.filter='brightness(1)' }}>{salon.meta?.booking_button_hero_text ?? 'احجز موعدك الآن'}</button>
              </div>
              {/* Stats bar */}
              <div className="reveal reveal-d3 float-anim flex items-center justify-around px-8 py-4" style={{ marginTop: '8px', maxWidth: '420px', background: 'rgba(10,12,18,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid rgba(${primaryRgb},0.22)`, borderTop: `1px solid rgba(255,255,255,0.10)`, borderRadius: '20px', boxShadow: `0 0 0 1px rgba(${primaryRgb},0.08), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
                <span className="inline-flex flex-col items-center leading-tight">
                  <span className="inline-flex items-center gap-1"><svg className="h-2.5 w-2.5 flex-shrink-0" style={{ color: 'var(--primary)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span className="text-base font-bold" style={{ color: 'var(--primary)' }}>{salon.meta?.rating ?? '4.9'}</span></span>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>التقييم</span>
                </span>
                <span className="w-px h-5" style={{ background: 'var(--border)' }} />
                <span className="inline-flex flex-col items-center leading-tight">
                  <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>+{salon.meta?.happy_clients ?? '500'}</span>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>عميل راضٍ</span>
                </span>
                <span className="w-px h-5" style={{ background: 'var(--border)' }} />
                <span className="inline-flex flex-col items-center leading-tight">
                  <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>+{salon.meta?.years_experience ?? '10'}</span>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>سنوات خبرة</span>
                </span>
              </div>
            </div>

          </div>

          <div className="scroll-dot absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none" style={{ transform: 'translateX(-50%)' }}>
            <div className="text-[10px] tracking-widest uppercase">اكتشف</div>
            <div className="h-7 w-px" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,.3),transparent)' }} />
          </div>
        </section>

        {/* ── INFO BAR ── */}
        <div className="section-light">
          <div className="mx-auto max-w-6xl px-4 lg:px-6">
            <div className="card grid grid-cols-3 rounded-2xl overflow-hidden" style={{ borderTop: `2px solid rgba(${primaryRgb},.55)`, borderRight: isLightBg ? '1px solid rgba(0,0,0,0.08)' : `1px solid rgba(${primaryRgb},.18)`, borderBottom: isLightBg ? '1px solid rgba(0,0,0,0.08)' : `1px solid rgba(${primaryRgb},.18)`, borderLeft: isLightBg ? '1px solid rgba(0,0,0,0.08)' : `1px solid rgba(${primaryRgb},.18)`, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,.45)', marginTop: '40px' }}>
              {/* الحجز */}
              <div className="flex flex-col items-center gap-1.5 px-3 py-4 sm:px-5 sm:py-5">
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <div className="text-[10px] sm:text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>الحجز</div>
                <div className="text-xs sm:text-sm font-extrabold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>بالحجز المسبق فقط</div>
              </div>
              {/* الموقع */}
              <div className="flex flex-col items-center gap-1.5 px-3 py-4 sm:px-5 sm:py-5">
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <div className="text-[10px] sm:text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>الموقع</div>
                <div className="text-xs sm:text-sm font-extrabold text-center leading-tight truncate max-w-full" style={{ color: 'var(--text-primary)' }}>{neighborhood}</div>
              </div>
              {/* ساعات العمل */}
              <div className="flex flex-col items-center gap-1.5 px-3 py-4 sm:px-5 sm:py-5">
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <div className="text-[10px] sm:text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>ساعات العمل</div>
                <div className="text-xs sm:text-sm font-extrabold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>{workingHours}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUICK BOOKING ── */}
        <section className="section-dark">
          <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
            <div className="card relative overflow-hidden rounded-3xl reveal">
              <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 70% 15%,rgba(${primaryRgb},.1),transparent 55%)` }} />
              <div className="relative p-7 lg:flex lg:items-center lg:gap-12">
                <div className="lg:flex-1">
                  <div className="text-[11px] font-bold tracking-widest t-muted uppercase mb-1">{salon.name}</div>
                  <div className="text-2xl font-extrabold leading-snug mt-2">
                    {(salon.meta?.booking_hero_title ?? 'تفاصيل دقيقة\nأجواء راقية').split('\n').map((line, i, arr) =>
                      i < arr.length - 1 ? <span key={i}>{line}<br /></span> : <span key={i} className="text-gold">{line}</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed t-muted">{salon.meta?.booking_hero_description ?? 'حلاقة رجالية فاخرة في قلب المدينة، بالحجز المسبق فقط.'}</p>
                </div>
                <div className="card mt-6 lg:mt-0 lg:w-80 rounded-2xl p-5">
                  <div className="text-sm font-extrabold">{salon.meta?.booking_card_title ?? 'حجز سريع'}</div>
                  <div className="mt-1 text-xs t-muted">{salon.meta?.booking_card_subtitle ?? 'اختر الحلاق والخدمة والوقت… والباقي علينا.'}</div>
                  <div className="mt-4 grid gap-2.5 text-sm t-secondary">
                    {[salon.meta?.booking_step1 ?? 'اختر الحلاق', salon.meta?.booking_step2 ?? 'حدّد الخدمات', salon.meta?.booking_step3 ?? 'ثبّت موعدك'].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-black" style={{ background: 'var(--primary)', color: btnTextColor }}>{i+1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => openBooking()} className="btn-gold mt-5 w-full rounded-xl px-4 py-3 text-sm font-extrabold">{salon.meta?.booking_button_text ?? 'ابدأ الحجز'}</button>
                </div>
                {barbers.length > 0 && (
                  <div className="mt-5 lg:hidden flex flex-wrap gap-2">
                    {barbers.map(b => (
                      <button key={b.id} type="button" onClick={() => openBooking('', b.name)} className="rounded-full px-4 py-1.5 text-xs t-secondary transition-all duration-200 hover:border-gold/40 hover:text-gold" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>{b.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        {services.length > 0 && (
        <section id="services" className="scroll-mt-24 section-light">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24 lg:px-12">

            {/* Header */}
            <div className="reveal mb-12">
              <span className="sec-label">خدماتنا</span>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl" style={{ letterSpacing: '-0.02em' }}>قائمة الخدمات والأسعار</h2>
            </div>

            {/* Cards grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 reveal">
              {services.map((s, i) => (
                <div
                  key={s.id}
                  dir="rtl"
                  className={`glass-card reveal reveal-d${Math.min(i + 1, 4)} group relative flex flex-col gap-4 rounded-2xl p-5`}
                  style={{
                    borderRadius: '16px',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.35)`,
                    border: `1px solid rgba(${primaryRgb},0.12)`,
                    transition: 'transform 0.3s cubic-bezier(.4,0,.2,1), box-shadow 0.3s cubic-bezier(.4,0,.2,1), border-color 0.3s ease, background 0.3s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-4px)'
                    el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.09), 0 0 0 1px rgba(${primaryRgb},0.2), 0 12px 40px rgba(0,0,0,0.45), 0 0 20px rgba(${primaryRgb},0.08)`
                    el.style.borderColor = `rgba(${primaryRgb},0.3)`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(0)'
                    el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.35)`
                    el.style.borderColor = `rgba(${primaryRgb},0.12)`
                  }}
                >
                  {/* Icon + Name */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `rgba(${primaryRgb},0.1)`, border: `1px solid rgba(${primaryRgb},0.18)` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6-6 6 6"/><path d="M6 15l6 6 6-6"/>
                      </svg>
                    </span>
                    <span className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{s.name_ar}</span>
                  </div>

                  {/* Price + Duration */}
                  <div className="flex items-end justify-between border-t pt-3" style={{ borderColor: `rgba(${primaryRgb},0.1)` }}>
                    <span className="text-xl font-black leading-none" style={{ color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                      {s.price}
                      <span className="mr-1 text-xs font-semibold" style={{ color: `rgba(${primaryRgb},0.7)` }}>ر.س</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                      {s.duration_min} دقيقة
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => openBooking()}
              className="btn-gold reveal mt-8 w-full rounded-xl py-3.5 text-sm font-bold"
            >
              احجز الآن
            </button>
          </div>
        </section>
        )}

        {/* ── OFFERS ── */}
        {(salon.meta?.offers?.filter(o => o.is_active) ?? []).length > 0 && (
        <section id="offers" className="scroll-mt-24 border-y border-white/5 section-light">
          <div className="mx-auto max-w-6xl px-4 py-14 lg:py-20 lg:px-6">
            <div className="reveal mb-10">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">عروضنا</h2>
            </div>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {salon.meta!.offers!.filter(o => o.is_active).slice(0, 3).map((offer, i) => {
                const offerServices = (offer.service_ids ?? []).map(sid => services.find(s => s.id === sid)?.name_ar).filter(Boolean)
                const glow = `rgba(${primaryRgb},0.13)`
                return (
                  <div key={offer.id} dir="rtl" className={`card reveal reveal-d${i + 1} relative rounded-2xl p-6 hover:scale-[1.02]`}
                    style={{ transition: 'all 300ms', borderRadius: '16px', boxShadow: `var(--card-shadow), 0 0 24px ${glow}` }}>
                    {/* Soft radial glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${glow}, transparent)` }} />
                    {/* Badge */}
                    {offer.badge && (
                      <div className="absolute top-4 left-4 px-3 py-1 text-xs font-medium rounded-full border"
                        style={{ backgroundColor: `rgba(${primaryRgb},0.1)`, color: 'var(--primary)', borderColor: `rgba(${primaryRgb},0.25)` }}>
                        {offer.badge}
                      </div>
                    )}
                    <div className="relative">
                      {offer.badge && <div className="mb-6" />}
                      <h3 className="text-2xl font-extrabold t-primary mb-1.5 leading-tight tracking-tight">{offer.title}</h3>
                      {offer.description && <p className="t-muted text-sm leading-relaxed mb-5">{offer.description}</p>}
                      {offerServices.length > 0 && (
                        <ul className="mb-5 space-y-3">
                          {offerServices.map(name => (
                            <li key={name} className="flex items-center gap-3 text-sm t-secondary">
                              <span className="text-[11px] shrink-0 leading-none" style={{ color: 'var(--primary)' }}>✦</span>
                              <span>{name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="border-t border-white/8 mb-4" />
                      <div className="mb-5">
                        {offer.price_current && <div className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--primary)' }}>{offer.price_current} <span className="text-lg">ر.س</span></div>}
                        {offer.price_old && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs t-muted line-through">{offer.price_old} ر.س</span>
                          </div>
                        )}
                        {offer.price_old && offer.price_current && (() => {
                          const saving = Math.round(parseFloat(offer.price_old) - parseFloat(offer.price_current))
                          return saving > 0 ? (
                            <div className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--primary)' }}>وفّر {saving} ريال</div>
                          ) : null
                        })()}
                      </div>
                      <button type="button" onClick={() => openBooking(offer.title)}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                        style={{ background: `linear-gradient(135deg, var(--primary) 0%, rgba(${primaryRgb},.72) 100%)`, color: btnTextColor, boxShadow: `0 0 0px ${glow}` }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 18px ${glow}`)}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0px ${glow}`)}>
                        احجز الآن
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        )}

        {/* ── WHY US ── */}
        <section id="why-us" className="scroll-mt-24 section-dark">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
            <div className="reveal mb-12">
<h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{salon.meta?.features_title ?? 'ماذا يميزنا'}</h2>
              <p className="mt-2 t-muted leading-relaxed">{salon.meta?.features_subtitle ?? 'نحن لسنا مجرد صالون حلاقة — نحن تجربة كاملة.'}</p>
            </div>
            <div className="grid gap-10 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-5 reveal">
                <div className="overflow-hidden rounded-3xl border border-gold/15 shadow-glow h-full" style={{ minHeight: '420px' }}>
                  <img src={salon.meta?.feature_image || '/barber.jpg'} alt={`صالون ${salon.name}`} className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]" loading="lazy" />
                </div>
              </div>
              <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2 reveal reveal-d1">
                {(salon.meta?.features?.filter(f => f.title.trim()) ?? []).length > 0
                  ? salon.meta!.features!.filter(f => f.title.trim()).map((f, i) => (
                    <div key={i} className="glass-card rounded-3xl p-6">
                      <div className="mb-3 text-2xl leading-none" style={{ color: 'var(--primary)', textShadow: `0 0 10px rgba(${primaryRgb},.22), 0 0 4px rgba(${primaryRgb},.12)` }}>✦</div>
                      <h3 className="text-lg font-extrabold mb-2">{f.title}</h3>
                      <p className="text-sm t-muted leading-relaxed">{f.description}</p>
                    </div>
                  ))
                  : [
                    { title: 'دقة في التفاصيل', desc: 'كل قصة تُنفَّذ بدقة متناهية تناسب ملامح وجهك وأسلوبك.' },
                    { title: 'أدوات احترافية', desc: 'نستخدم أفضل الأدوات المعقمة لضمان نظافة وجودة عالية في كل جلسة.' },
                    { title: 'حجز سريع ومنظم', desc: 'نظام حجز سهل وسريع يُنظّم وقتك بدون انتظار أو ازدحام.' },
                    { title: 'تجربة فاخرة للرجال', desc: 'أجواء راقية وهادئة صُمِّمت خصيصًا لتجعل زيارتك تجربة لا تُنسى.' },
                  ].map((f, i) => (
                    <div key={i} className="glass-card rounded-3xl p-6">
                      <div className="mb-3 text-2xl leading-none" style={{ color: 'var(--primary)', textShadow: `0 0 10px rgba(${primaryRgb},.22), 0 0 4px rgba(${primaryRgb},.12)` }}>✦</div>
                      <h3 className="text-lg font-extrabold mb-2">{f.title}</h3>
                      <p className="text-sm t-muted leading-relaxed">{f.desc}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </section>


        {/* ── ABOUT ── */}
        <section id="about" className="scroll-mt-24 border-y border-white/5 section-light">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6 reveal">
                <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{salon.meta?.about_title ?? 'لماذا تختارنا'}</h2>
                {salon.meta?.about_description && (
                  <p className="mt-5 t-muted leading-loose">{salon.meta.about_description}</p>
                )}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    { v: `+${salon.meta?.years_experience ?? 10}`, l: 'سنوات خبرة' },
                    { v: String(salon.meta?.rating ?? '4.9'), l: 'تقييم من 5' },
                    { v: `+${salon.meta?.happy_clients ?? 500}`, l: 'عميل راضٍ' },
                  ].map(s => (
                    <div key={s.l} className="glass-card rounded-3xl p-5 text-center">
                      <div className="text-3xl font-extrabold text-gold">{s.v}</div>
                      <div className="mt-1 text-xs t-muted">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REVIEWS ── */}
        <section id="reviews" className="scroll-mt-24 section-light">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
            <div className="reveal">
              <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{salon.meta?.reviews_title ?? 'التقييمات'}</h2>
              {(salon.meta?.reviews_subtitle) && (
                <p className="mt-2 t-muted leading-relaxed">{salon.meta.reviews_subtitle}</p>
              )}
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {(salon.meta?.reviews?.length
                ? salon.meta.reviews
                : [
                    { name: 'عميل راضٍ', text: 'حلاق على مستوى عالي، نظافة واحترام وخدمة ممتازة.' },
                    { name: 'عميل راضٍ', text: 'من أفضل حلاقين الرياض وتعامل راقي.' },
                    { name: 'عميل راضٍ', text: 'محل جميل ونظيف وخدمة احترافية.' },
                  ]
              ).map((r, i) => (
                <figure key={i} className={`glass-card reveal reveal-d${i+1} rounded-3xl p-7`}>
                  <div className="text-xl text-gold mb-4" aria-label="★★★★★">
                    {'★★★★★'.split('').map((s, j) => <span key={j} className="star-pop">{s}</span>)}
                  </div>
                  <blockquote className="text-sm t-secondary leading-relaxed">{r.text}</blockquote>
                  <figcaption className="mt-4 text-xs t-muted">{r.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── LOCATION ── */}
        {mapUrl && (
        <section id="location" className="scroll-mt-24 border-y border-white/5 section-dark">
          <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6 reveal">
              <div>
                <div className="sec-label">زرنا</div>
                <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">الموقع</h2>
              </div>
            </div>
            <div className="mt-4 reveal">
              <a href={salon.meta?.map_place_url} target="_blank" rel="noopener noreferrer"
                className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                افتح في خرائط Google
              </a>
            </div>
            {salon.meta?.map_embed_url && (
            <div className="mt-12 overflow-hidden rounded-3xl border border-white/8 shadow-soft reveal">
              <iframe title={`موقع ${salon.name}`} className="h-[420px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                src={salon.meta.map_embed_url} />
            </div>
            )}
          </div>
        </section>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5" style={{ background: 'rgba(0,0,0,.6)' }}>
        <div className="mx-auto max-w-6xl px-4 py-12 text-center lg:px-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-12" style={{ background: `linear-gradient(to left,rgba(${primaryRgb},.12),transparent)` }} />
            <span className="text-gold/50 text-xs">✦</span>
            <span className="h-px w-12" style={{ background: `linear-gradient(to right,rgba(${primaryRgb},.12),transparent)` }} />
          </div>
          <div className="font-extrabold text-lg t-secondary">{salon.name}</div>
          <div className="mt-1 text-sm t-muted">حجز مسبق فقط • {workingHours} • جميع أيام الأسبوع</div>
          <div className="mt-5 text-xs t-muted">© {new Date().getFullYear()} جميع الحقوق محفوظة</div>
        </div>
      </footer>

      <div className="py-8 text-center">
        <a href="/dashboard/login" className="btn-gold inline-block rounded-xl px-6 py-3 text-sm font-bold">بوابة الإدارة</a>
      </div>

      {/* ── BOOKING MODAL ── */}
      {bookingOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) setBookingOpen(false) }} aria-hidden="false">
          <div role="dialog" aria-modal={true} aria-labelledby="bookingTitle" className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gold/20 shadow-glow-lg" style={{ background: '#0b0b0b' }}>
            <div className="border-b border-white/8 px-6 py-5" style={{ background: 'rgba(255,255,255,.03)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="bookingTitle" className="text-xl font-extrabold">حجز موعد</h3>
                  <p className="mt-1 text-sm text-white/50">عبّئ البيانات واختر الخدمة والوقت المناسب.</p>
                </div>
                <button type="button" onClick={() => setBookingOpen(false)} className="rounded-xl border border-white/10 p-2 text-white/60 transition-all duration-200 hover:border-gold/30 hover:text-white focus:outline-none" style={{ background: 'rgba(255,255,255,.05)' }} aria-label="إغلاق">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-6" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/75">الاسم</span>
                  <input required name="name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="field-input h-11 rounded-xl border border-white/10 px-4 text-sm text-white placeholder:text-white/25 transition-all duration-200" style={{ background: 'rgba(0,0,0,.4)' }} placeholder="الاسم الكريم" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/75">رقم الجوال</span>
                  <input required name="phone" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={handlePhone} onKeyDown={e => { if ((e.key==='Backspace'||e.key==='Delete') && (e.currentTarget.selectionStart??0)<=2 && e.currentTarget.selectionStart===e.currentTarget.selectionEnd) e.preventDefault() }} onFocus={e => { setTimeout(()=>{ if((e.target.selectionStart??0)<2) e.target.setSelectionRange(2,2) },0) }} onClick={e => { if((e.currentTarget.selectionStart??0)<2) e.currentTarget.setSelectionRange(2,2) }} className="field-input h-11 rounded-xl border border-white/10 px-4 text-sm text-white placeholder:text-white/25 transition-all duration-200" style={{ background: 'rgba(0,0,0,.4)' }} placeholder="05xxxxxxxx" maxLength={10} />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/75">اختيار الحلاق</span>
                  <select required name="barber" value={barber} onChange={e => setBarber(e.target.value)} className="field-input h-11 rounded-xl border border-white/10 px-4 text-sm text-white transition-all duration-200" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <option value="" disabled>اختر الحلاق</option>
                    {barbers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/75">اختيار التاريخ</span>
                  <input required name="date" type="date" value={date} min={today} onChange={e => setDate(e.target.value)} className="field-input h-11 rounded-xl border border-white/10 px-4 text-sm text-white transition-all duration-200" style={{ background: 'rgba(0,0,0,.4)' }} />
                </label>
              </div>

              <fieldset className="mt-4 rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,.03)' }}>
                <legend className="px-2 text-sm font-extrabold text-white/75">اختيار الخدمة (يمكن اختيار أكثر من خدمة)</legend>
                <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-white/8 p-3" style={{ background: 'rgba(0,0,0,.2)' }}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {services.map(svc => (
                      <label key={svc.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white/70 transition-all duration-200 hover:border-gold/25 hover:bg-gold/5" style={{ background: 'rgba(0,0,0,.1)' }}>
                        <span>{svc.name_ar} — <span style={{ color: 'var(--primary)' }}>{svc.price} ر.س</span></span>
                        <input className="h-4 w-4" style={{ accentColor: 'var(--primary)' }} type="checkbox" name="service" value={svc.name_ar} checked={checkedServices.has(svc.name_ar)} onChange={() => toggleService(svc.name_ar)} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-3 text-sm font-bold text-left" style={{ color: 'var(--primary)' }}>
                  المجموع: {services.filter(s => checkedServices.has(s.name_ar)).reduce((sum, s) => sum + s.price, 0)} ر.س
                </div>
              </fieldset>

              <div className="mt-4 grid gap-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/75">اختيار الوقت</span>
                  <select required name="time" value={time} onChange={e => setTime(e.target.value)} className="field-input h-11 rounded-xl border border-white/10 px-4 text-sm text-white transition-all duration-200" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <option value="" disabled>اختر الوقت</option>
                    {timeOpts.map(o => <option key={o.value} value={o.value} disabled={o.booked}>{o.booked ? `${o.label} (محجوز)` : o.label}</option>)}
                  </select>
                </label>
                <p className="text-xs text-white/30">الأوقات المتاحة كل 30 دقيقة حسب جدول الحلاق.</p>
              </div>

              {formMsg && (
                <div className="mt-4 rounded-2xl border px-4 py-3 text-sm text-white/80" style={{ borderColor: formMsg.error ? 'rgba(239,68,68,.35)' : `rgba(${primaryRgb},.28)`, background: formMsg.error ? 'rgba(239,68,68,.08)' : `rgba(${primaryRgb},.08)` }}>
                  {formMsg.text}
                </div>
              )}

              <div className="mt-6 mb-1 text-center text-lg font-extrabold" style={{ color: 'var(--primary)' }}>
                إجمالي الطلب: {services.filter(s => checkedServices.has(s.name_ar)).reduce((sum, s) => sum + s.price, 0)} ر.س
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={submitting} className="btn-gold w-full rounded-xl px-6 py-3 text-sm font-extrabold focus:outline-none sm:w-auto disabled:opacity-60">
                  {submitting ? '...' : 'تأكيد الحجز'}
                </button>
                <button type="button" onClick={handleWhatsApp} className="w-full rounded-xl border border-gold/30 px-6 py-3 text-sm font-extrabold text-white/75 transition-all duration-200 hover:border-gold/55 hover:text-white sm:w-auto" style={{ background: 'rgba(0,0,0,.35)' }}>واتساب</button>
                <button type="button" onClick={() => setBookingOpen(false)} className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white/85 sm:w-auto" style={{ background: 'rgba(255,255,255,.04)' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
