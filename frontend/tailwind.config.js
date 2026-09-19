/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-figtree)',
  				'var(--font-source-sans-3)',
  				'system-ui',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-outfit)',
  				'var(--font-figtree)',
  				'sans-serif'
  			]
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			tertiary: '#64748b',
  			brand: {
  				// Coral is reserved for the "audio is live" affordance only.
  				coral: '#F9424A',
  				coralHover: '#E8383F',
  				coralBright: '#FF5A60',
  				coralTint: '#FFECEC',
  				coralTintText: '#C4343A',
  				ink: '#17161A',
  				inkHover: '#26252B',
  				graphite: '#26242B',
  				body: '#EDEDF2',
  				side: '#DCDCE6',
  				wood: '#E7DCC8',
  				// Neutral cool-gray fills (was a coral tint). Kept as `eraser`
  				// so existing hover/active surfaces are neutralized automatically.
  				eraser: '#F1F1F3',
  				fill: '#F1F1F3',
  				subtle: '#F6F6F8',
  				hairline: '#E7E7EA',
  				controlBorder: '#E2E2E6'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Cool-neutral shadows (never coral-tinted). Overriding the default scale
  		// retints existing shadow-sm/DEFAULT/md/lg usages app-wide.
  		boxShadow: {
  			sm: '0 1px 2px rgba(18, 19, 23, 0.09)',
  			DEFAULT: '0 1px 2px rgba(18, 19, 23, 0.09)',
  			md: '0 4px 12px rgba(18, 19, 23, 0.12), 0 1px 3px rgba(18, 19, 23, 0.1)',
  			lg: '0 8px 26px rgba(18, 19, 23, 0.16), 0 1px 3px rgba(18, 19, 23, 0.1)',
  			raised: '0 1px 2px rgba(18, 19, 23, 0.09)',
  			floating: '0 8px 26px rgba(18, 19, 23, 0.16), 0 1px 3px rgba(18, 19, 23, 0.1)',
  			window: '0 26px 64px rgba(18, 19, 23, 0.2), 0 1px 3px rgba(18, 19, 23, 0.1)',
  			// The one coral-tinted exception: the Start Recording affordance.
  			record: '0 1px 2px rgba(200, 40, 46, 0.3)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
  ],
}