[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# This generator writes the actual revision script with UTF-8 BOM so PowerShell
# parses unicode chars correctly when running via -File.
# Inside the generated script we use [char]0xNNNN for any non-ASCII chars to
# avoid relying on the file encoding entirely.

$lines = New-Object System.Collections.Generic.List[string]

function L { param($s) $script:lines.Add($s) }

L '$ErrorActionPreference = ''Stop'''
L '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8'
L '$dir = ''C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation'''
L ''
L '$bt   = [string][char]0x60   # `'
L '$em   = [string][char]0x2014 # —'
L '$ge   = [string][char]0x2265 # >='
L '$btE  = [regex]::Escape($bt)'
L ''
L 'function Replace-Regex {'
L '    param([string]$Path, [string]$Pattern, [string]$Replacement, [string]$Tag)'
L '    $content = Get-Content -Raw -Encoding UTF8 -Path $Path'
L '    $matches = [regex]::Matches($content, $Pattern)'
L '    if ($matches.Count -eq 0) { Write-Host "[$Tag] PATTERN-NOT-FOUND in $Path"; return $false }'
L '    if ($matches.Count -gt 1) { Write-Host "[$Tag] PATTERN-AMBIGUOUS ($($matches.Count) matches) in $Path"; return $false }'
L '    $newContent = [regex]::Replace($content, $Pattern, $Replacement)'
L '    [System.IO.File]::WriteAllText($Path, $newContent, (New-Object System.Text.UTF8Encoding $false))'
L '    Write-Host "[$Tag] OK in $Path"'
L '    return $true'
L '}'
L ''
L 'function Replace-Literal {'
L '    param([string]$Path, [string]$Old, [string]$New, [string]$Tag)'
L '    $content = Get-Content -Raw -Encoding UTF8 -Path $Path'
L '    if (-not $content.Contains($Old)) { Write-Host "[$Tag] OLD-NOT-FOUND in $Path"; return $false }'
L '    $count = [regex]::Matches($content, [regex]::Escape($Old)).Count'
L '    if ($count -gt 1) { Write-Host "[$Tag] AMBIGUOUS ($count) in $Path"; return $false }'
L '    $newContent = $content.Replace($Old, $New)'
L '    [System.IO.File]::WriteAllText($Path, $newContent, (New-Object System.Text.UTF8Encoding $false))'
L '    Write-Host "[$Tag] OK in $Path"'
L '    return $true'
L '}'
L ''
L '$f04 = Join-Path $dir ''01-04-PLAN.md'''
L '$f05 = Join-Path $dir ''01-05-PLAN.md'''
L '$f06 = Join-Path $dir ''01-06-PLAN.md'''
L '$f07 = Join-Path $dir ''01-07-PLAN.md'''

# ============================================================
# B3 — 01-04: Replace mobile hamburger placeholder with working Sheet
# ============================================================
L ''
L '# ============================================================'
L '# B3 — 01-04: Mobile hamburger -> working Sheet'
L '# ============================================================'
L ''

# (B3-1) Add `npx shadcn@latest add sheet` to Task 1 install step
# Current text:
# 1. **Add deps:** `npm install clsx tailwind-merge` and `npm install @tabler/icons-react` (per UI-SPEC line 25 — Tabler is the locked icon library; Plan 01-05/06/07 will use it).
# Change to add the shadcn sheet install line right after.

L '$b3_addsheet_old = ''1. **Add deps:** `npm install clsx tailwind-merge` and `npm install @tabler/icons-react` (per UI-SPEC line 25 '' + $em + '' Tabler is the locked icon library; Plan 01-05/06/07 will use it).'''
L '$b3_addsheet_new = ''1. **Add deps:** `npm install clsx tailwind-merge` and `npm install @tabler/icons-react` (per UI-SPEC line 25 '' + $em + '' Tabler is the locked icon library; Plan 01-05/06/07 will use it). Also install the shadcn Sheet primitive that Task 2 requires for the mobile navigation menu: `npx shadcn@latest add sheet`. Verify it landed at `components/ui/sheet.tsx`.'''
L 'Replace-Literal -Path $f04 -Old $b3_addsheet_old -New $b3_addsheet_new -Tag ''B3-04-task1-add-sheet-install'''

# (B3-2) Replace the mobile hamburger placeholder in Task 2 action narrative.
# Original: starts with "Mobile (<960px) collapses links into a shadcn Sheet hamburger — but **shadcn Sheet is not yet installed**, so for Plan 01-04 keep mobile to a placeholder hamburger button that does nothing on click; Plan 01-05 OR a follow-up plan can add the Sheet integration. (Acceptable scoping — the StickyNav is functional on desktop; mobile-menu interactivity is a polish layer that doesn't block any Phase 1 success criterion.)"

L '$b3_narrative_old = ''2. **`components/home/StickyNav.tsx`** '' + $em + '' 68px sticky nav. Client component (uses `usePathname` for active link state and a scroll-effect `useState` later if needed; keep mount-time logic minimal in this plan). Contains LogoMark + wordmark + 4 nav links + 2 CTAs. Mobile (<960px) collapses links into a shadcn Sheet hamburger '' + $em + '' but **shadcn Sheet is not yet installed**, so for Plan 01-04 keep mobile to a placeholder hamburger button that does nothing on click; Plan 01-05 OR a follow-up plan can add the Sheet integration. (Acceptable scoping '' + $em + '' the StickyNav is functional on desktop; mobile-menu interactivity is a polish layer that doesn'''''t block any Phase 1 success criterion.)'''
L '$b3_narrative_new = ''2. **`components/home/StickyNav.tsx`** '' + $em + '' 68px sticky nav. Client component (uses `usePathname` for active link state and a scroll-effect `useState` later if needed; keep mount-time logic minimal in this plan). Contains LogoMark + wordmark + 4 nav links + 2 CTAs. Mobile (<960px) collapses links into a working `<MobileNavSheet>` built on the shadcn Sheet primitive (installed in Task 1 step 1). The Sheet is keyboard-accessible by default (focus trap, Escape to close, focus return) per shadcn defaults '' + $em + '' satisfies FOUN-03. Below-960px mobile users MUST be able to reach `/bips`, `/what-is-a-bip`, `/login`, `/register`, and the in-page section anchors via the sheet. This is owned end-to-end by Plan 01-04; do not defer to a downstream plan.'''
L 'Replace-Literal -Path $f04 -Old $b3_narrative_old -New $b3_narrative_new -Tag ''B3-04-task2-narrative'''

# (B3-3) Replace the mobile hamburger JSX block.
# Old:
#             {/* Mobile hamburger placeholder — the Sheet integration will be added
#                 as a polish layer; CTAs stay reachable so navigation is not blocked. */}
#             <button
#               className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-border text-ink-2"
#               aria-label="Open menu"
#               type="button"
#             >
#               <span aria-hidden="true">☰</span>
#             </button>

L '$b3_jsx_old_lines = @('
L '''            {/* Mobile hamburger placeholder '' + $em + '' the Sheet integration will be added'','
L '''                as a polish layer; CTAs stay reachable so navigation is not blocked. */}'','
L '''            <button'','
L '''              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-border text-ink-2"'','
L '''              aria-label="Open menu"'','
L '''              type="button"'','
L '''            >'','
L '''              <span aria-hidden="true">'' + [char]0x2630 + ''</span>'','
L '''            </button>'''
L ')'
L '$b3_jsx_old = ($b3_jsx_old_lines -join "`n")'

L '$b3_jsx_new_lines = @('
L '''            {/* Mobile nav menu (B3 — owned by Plan 01-04). Sheet is keyboard-accessible'','
L '''                (focus trap, Escape, focus return) per shadcn defaults; satisfies FOUN-03'','
L '''                for <960px viewports where desktop nav links are hidden. */}'','
L '''            <Sheet>'','
L '''              <SheetTrigger asChild>'','
L '''                <button'','
L '''                  className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border border-border text-ink-2"'','
L '''                  aria-label="Open navigation menu"'','
L '''                  type="button"'','
L '''                >'','
L '''                  <span aria-hidden="true">'' + [char]0x2630 + ''</span>'','
L '''                </button>'','
L '''              </SheetTrigger>'','
L '''              <SheetContent side="right" className="w-[280px] sm:w-[320px]">'','
L '''                <SheetHeader>'','
L '''                  <SheetTitle>Menu</SheetTitle>'','
L '''                </SheetHeader>'','
L '''                <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile primary">'','
L '''                  {NAV_LINKS.map((link) => ('','
L '''                    <SheetClose asChild key={link.href}>'','
L '''                      <Link'','
L '''                        href={link.href}'','
L '''                        className="block px-2 py-3 text-base font-medium text-ink hover:text-eu-blue rounded-md hover:bg-bg-soft"'','
L '''                      >'','
L '''                        {link.label}'','
L '''                      </Link>'','
L '''                    </SheetClose>'','
L '''                  ))}'','
L '''                  <div className="mt-2 border-t border-border pt-4 flex flex-col gap-2">'','
L '''                    <SheetClose asChild>'','
L '''                      <Link href="/login"><Button variant="ghost" className="w-full">Sign in</Button></Link>'','
L '''                    </SheetClose>'','
L '''                    <SheetClose asChild>'','
L '''                      <Link href="/register"><Button variant="primary" className="w-full">List your BIP</Button></Link>'','
L '''                    </SheetClose>'','
L '''                  </div>'','
L '''                </nav>'','
L '''              </SheetContent>'','
L '''            </Sheet>'''
L ')'
L '$b3_jsx_new = ($b3_jsx_new_lines -join "`n")'

L 'Replace-Literal -Path $f04 -Old $b3_jsx_old -New $b3_jsx_new -Tag ''B3-04-task2-jsx'''

# (B3-4) Add the imports for Sheet at the top of StickyNav.
# Original first import lines:
#    'use client'
#    import Link from 'next/link'
#    import { usePathname } from 'next/navigation'
#    import { LogoMark } from './LogoMark'
#    import { Button } from '@/components/ui/Button'
#    import { cn } from '@/lib/utils/cn'

L '$b3_imp_old = "   ''use client''" + [char]10 +'
L '''   import Link from ''''next/link'''''' + [char]10 +'
L '''   import { usePathname } from ''''next/navigation'''''' + [char]10 +'
L '''   import { LogoMark } from ''''./LogoMark'''''' + [char]10 +'
L '''   import { Button } from ''''@/components/ui/Button'''''' + [char]10 +'
L '''   import { cn } from ''''@/lib/utils/cn'''''''
L '$b3_imp_new = "   ''use client''" + [char]10 +'
L '''   import Link from ''''next/link'''''' + [char]10 +'
L '''   import { usePathname } from ''''next/navigation'''''' + [char]10 +'
L '''   import { LogoMark } from ''''./LogoMark'''''' + [char]10 +'
L '''   import { Button } from ''''@/components/ui/Button'''''' + [char]10 +'
L '''   import { cn } from ''''@/lib/utils/cn'''''' + [char]10 +'
L '''   import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from ''''@/components/ui/sheet'''''''
L 'Replace-Literal -Path $f04 -Old $b3_imp_old -New $b3_imp_new -Tag ''B3-04-task2-imports'''

# (B3-5) Update files_modified frontmatter to include components/ui/sheet.tsx
L '$b3_fm_old = "files_modified:" + [char]10 +'
L '''  - app/globals.css'' + [char]10 +'
L '''  - app/(public)/layout.tsx'' + [char]10 +'
L '''  - components/home/StickyNav.tsx'' + [char]10 +'
L '''  - components/home/Footer.tsx'' + [char]10 +'
L '''  - components/home/LogoMark.tsx'' + [char]10 +'
L '''  - components/ui/Button.tsx'' + [char]10 +'
L '''  - lib/utils/cn.ts'' + [char]10 +'
L '''  - package.json'''
L '$b3_fm_new = "files_modified:" + [char]10 +'
L '''  - app/globals.css'' + [char]10 +'
L '''  - app/(public)/layout.tsx'' + [char]10 +'
L '''  - components/home/StickyNav.tsx'' + [char]10 +'
L '''  - components/home/Footer.tsx'' + [char]10 +'
L '''  - components/home/LogoMark.tsx'' + [char]10 +'
L '''  - components/ui/Button.tsx'' + [char]10 +'
L '''  - components/ui/sheet.tsx'' + [char]10 +'
L '''  - lib/utils/cn.ts'' + [char]10 +'
L '''  - package.json'''
L 'Replace-Literal -Path $f04 -Old $b3_fm_old -New $b3_fm_new -Tag ''B3-04-frontmatter'''

# (B3-6) Add acceptance criterion for working mobile Sheet to Task 2.
L '$b3_ac_old = ''    - `npm run build` exits 0'' + [char]10 +'
L '''    - `npm run dev` and `curl -s http://localhost:3000 | grep -c "Independent project"` returns '' + $ge + ''1'' + [char]10 +'
L '''    - `grep -rE "(\\b12\\b.*star|star.*\\b12\\b|length:[[:space:]]*12)" components/home/LogoMark.tsx` returns 0 matches (the EU 12-star prohibition)'''
L '$b3_ac_new = ''    - **B3 mobile-nav gate:** `components/ui/sheet.tsx` exists (installed via `npx shadcn@latest add sheet` in Task 1). `components/home/StickyNav.tsx` imports `Sheet, SheetTrigger, SheetContent, SheetClose` from `@/components/ui/sheet`. The hamburger `<button>` is wrapped in `<SheetTrigger asChild>` and the `<SheetContent>` renders `<Link>` elements for ALL of `/bips`, `/what-is-a-bip`, `/login`, `/register`. Mechanically: `grep -c "SheetTrigger\|SheetContent" components/home/StickyNav.tsx` '' + $ge + '' 2.'' + [char]10 +'
L '''    - `npm run build` exits 0'' + [char]10 +'
L '''    - `npm run dev` and `curl -s http://localhost:3000 | grep -c "Independent project"` returns '' + $ge + ''1'' + [char]10 +'
L '''    - `grep -rE "(\\b12\\b.*star|star.*\\b12\\b|length:[[:space:]]*12)" components/home/LogoMark.tsx` returns 0 matches (the EU 12-star prohibition)'''
L 'Replace-Literal -Path $f04 -Old $b3_ac_old -New $b3_ac_new -Tag ''B3-04-task2-acceptance'''

# ============================================================
# W1 — 01-04: Reframe must_haves.truths to user-observable outcomes
# ============================================================
L ''
L '# ============================================================'
L '# W1 — 01-04 must_haves.truths reframe'
L '# ============================================================'
L ''

L '$w1_old_lines = @('
L '''    - "Every page rendered under (public) shows a sticky 68px translucent nav with the BipHub LogoMark, and the Footer with the mandatory non-affiliation disclaimer"'','
L '''    - "The LogoMark renders exactly 11 stars in a ring (NEVER 12 '' + $em + '' STATE.md blocker, PITFALLS Pitfall 8, UI-SPEC line 122)"'','
L '''    - "Footer disclaimer text ''Independent project '' + $em + '' not affiliated with the European Commission'' appears in components/home/Footer.tsx source, with em-dash and no period (UI-SPEC line 239)"'','
L '''    - "app/globals.css declares the full EU palette + 6 choropleth tier colors + breakpoint overrides + radii + shadows in a single @theme inline block per UI-SPEC lines 152-184"'','
L '''    - "Tailwind v4 md: breakpoint resolves to 60rem (960px), lg: to 64rem (1024px), per UI-SPEC line 462-468"'','
L '''    - "All 5 primary palette tokens and 6 choropleth tiers are declared in @theme inline"'''
L ')'
L '$w1_old = ($w1_old_lines -join "`n")'

L '$w1_new_lines = @('
L '''    - "Every page rendered under (public) shows a sticky 68px translucent nav with the BipHub LogoMark, and the Footer with the mandatory non-affiliation disclaimer"'','
L '''    - "The LogoMark renders exactly 11 stars in a ring (NEVER 12 '' + $em + '' STATE.md blocker, PITFALLS Pitfall 8, UI-SPEC line 122)"'','
L '''    - "Footer disclaimer text ''Independent project '' + $em + '' not affiliated with the European Commission'' appears in components/home/Footer.tsx source, with em-dash and no period (UI-SPEC line 239)"'','
L '''    - "At a 959px viewport the desktop nav links are hidden and the hamburger is visible; at 960px+ the desktop links appear and the hamburger hides (verifies the md=60rem breakpoint override from UI-SPEC line 462-468)"'','
L '''    - "At a 1023px viewport the BIP detail layout is single-column; at 1024px+ the right sidebar becomes sticky (verifies the lg=64rem breakpoint override; sticky sidebar lands in 01-07 but the breakpoint is set in 01-04 globals.css and is testable via media-query inspection)"'','
L '''    - "Inter loads from /_next/static/media '' + $em + '' no requests to fonts.googleapis.com appear in the network tab (FOUN-04 in user-observable form)"'','
L '''    - "The map intensity tier classes (.fill-bip-tier-0..5) compile into the production CSS bundle '' + $em + '' verifiable via grep on .next/static/css/*.css (closes PITFALLS Pitfall 13 at the build-output layer)"'''
L ')'
L '$w1_new = ($w1_new_lines -join "`n")'
L 'Replace-Literal -Path $f04 -Old $w1_old -New $w1_new -Tag ''W1-04-must_haves-truths'''

# ============================================================
# W3 — 01-06: Add scope warning note to Task 3
# ============================================================
L ''
L '# ============================================================'
L '# W3 — 01-06: Scope warning on Task 3'
L '# ============================================================'
L ''

# Insert a one-line scope_warning paragraph at the top of Task 3 action body.
# Find the Task 3 <action> tag and inject right after it.
L '$w3_pattern = ''(<task type="auto">\s*\n\s*<name>Task 3: Filter sidebar \+ drawer \+ search bar \+ sort control[^<]*</name>[\s\S]*?<action>\s*\n)'''
L '$w3_replacement = ''$1**Scope note:** Task 3 co-locates 7 filter widgets across 2 client components (`BipFiltersSidebar`, `BipFiltersDrawer`). Effective file count after shadcn primitive emissions is ~12. Executor should mentally checkpoint between widgets to avoid context drift; if individual widget implementation begins to skim, stop and re-read the relevant UI-SPEC section before continuing.'' + [char]10 + [char]10'
L 'Replace-Regex -Path $f06 -Pattern $w3_pattern -Replacement $w3_replacement -Tag ''W3-06-task3-scope-note'''

# ============================================================
# W4 — 01-07 Task 3 step C: Remove the self-heal step (helper now owned by 01-02)
# ============================================================
L ''
L '# ============================================================'
L '# W4 — 01-07 Task 3 step C removal'
L '# ============================================================'
L ''

# Original block (around lines 956-976):
# **C. Verify `lib/countries.ts` exports `getCountryFlagEmoji(iso2)`.**
#
# If Plan 01-02 didn't add it, add it as a small helper at the bottom of `lib/countries.ts`:
#
# ```typescript
# /**
#  * ISO alpha-2 -> regional indicator emoji pair (works in modern OS-rendered fonts).
#  * Returns the 2-char regional indicator combo; renders as a flag in browsers + Satori.
#  */
# export function getCountryFlagEmoji(iso2: string): string {
#   if (!iso2 || iso2.length !== 2) return ''
#   const code = iso2.toUpperCase()
#   const A = 0x1f1e6
#   return String.fromCodePoint(
#     A + code.charCodeAt(0) - 65,
#     A + code.charCodeAt(1) - 65,
#   )
# }
# ```
#
# (If `getCountryFlagEmoji` already exists in `lib/countries.ts` from Plan 01-02, skip this step.)
#
# **D. Verify the OG image is auto-discovered by Next.js metadata.**

# We replace the C block with a one-liner pointing at 01-02 ownership, and renumber: D->C, E->D, F->E.
# Use regex to grab from "**C. Verify..." through "**D. Verify the OG..." line.

L '$w4_pattern = ''(?ms)\*\*C\. Verify `lib/countries\.ts` exports `getCountryFlagEmoji\(iso2\)`\.\*\*[\s\S]*?\(If `getCountryFlagEmoji` already exists in `lib/countries\.ts` from Plan 01-02, skip this step\.\)\s*\n\s*\n\*\*D\. Verify the OG image is auto-discovered by Next\.js metadata\.\*\*'''
L '$w4_replacement = ''**C. Verify the OG image is auto-discovered by Next.js metadata.**'''
L 'Replace-Regex -Path $f07 -Pattern $w4_pattern -Replacement $w4_replacement -Tag ''W4-07-remove-self-heal'''

# Renumber subsequent steps D->C is done above. Now E -> D and F -> E.
L '$w4_renumE_pattern = ''\*\*E\. Smoke-test the OG endpoint\.\*\*'''
L '$w4_renumE_repl    = ''**D. Smoke-test the OG endpoint.**'''
L 'Replace-Regex -Path $f07 -Pattern $w4_renumE_pattern -Replacement $w4_renumE_repl -Tag ''W4-07-renum-E-to-D'''

L '$w4_renumF_pattern = ''\*\*F\. Update `\(public\)/layout\.tsx` description\.\*\*'''
L '$w4_renumF_repl    = ''**E. Update `(public)/layout.tsx` description.**'''
L 'Replace-Regex -Path $f07 -Pattern $w4_renumF_pattern -Replacement $w4_renumF_repl -Tag ''W4-07-renum-F-to-E'''

# Acceptance criteria still references "lib/countries.ts exports getCountryFlagEmoji(iso2)";
# update to point at 01-02 ownership.
L '$w4_ac_old = ''    - `lib/countries.ts` exports `getCountryFlagEmoji(iso2)` (verified by grep on file)'''
L '$w4_ac_new = ''    - `lib/countries.ts` exports `getCountryFlagEmoji(code)` (owned by Plan 01-02; verified by `grep "export function getCountryFlagEmoji" lib/countries.ts` returning 1 match. If missing, Plan 01-02 has regressed '' + $em + '' fix there, not here.)'''
L 'Replace-Literal -Path $f07 -Old $w4_ac_old -New $w4_ac_new -Tag ''W4-07-acceptance-criterion'''

L ''
L 'Write-Host "DONE-batch1"'

$out = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\.tmp-batch1.ps1'
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines($out, $lines, $utf8WithBom)
Write-Host "Wrote $out with BOM ($($lines.Count) lines)"
