import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
    globalCss: {
        'html': { colorPalette: 'brand', scrollPaddingTop: '88px' },
        'body': { bg: 'bg.canvas', color: 'fg.default', fontFamily: 'body', lineHeight: 1.7 },
        '::selection': { bg: 'brand.muted', color: 'brand.fg' },
        'button, input, select, textarea': { fontFamily: 'inherit' },
        'input, td': { fontVariantNumeric: 'tabular-nums' },
        'a, button, input, select, textarea': { _focusVisible: { outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '3px' } },
    },
    theme: {
        recipes: {
            button: { base: { borderRadius: 'lg', fontWeight: 'semibold' } },
            input: { base: { borderRadius: 'lg', bg: 'bg.panel', borderColor: 'border.default', '--focus-color': 'colors.brand.solid' } },
            textarea: { base: { borderRadius: 'lg', bg: 'bg.panel', '--focus-color': 'colors.brand.solid' } },
            heading: { base: { fontWeight: 'semibold', lineHeight: 1.4, letterSpacing: '-0.025em' } },
            badge: { base: { borderRadius: 'full', px: '2.5', py: '1', fontWeight: 'medium', lineHeight: 1.3 } },
        },
        slotRecipes: {
            card: {
                slots: ['root', 'header', 'body', 'footer', 'title', 'description'],
                base: { root: { borderRadius: 'xl', minW: 0 }, body: { minW: 0 } },
                variants: { variant: { outline: { root: { bg: 'bg.panel', borderColor: 'border.default', boxShadow: 'sm' } } } },
            },
            table: {
                slots: ['root', 'header', 'body', 'footer', 'row', 'cell', 'columnHeader', 'caption'],
                base: {
                    root: { fontSize: 'sm' },
                    columnHeader: { bg: 'bg.subtle', color: 'fg.muted', fontWeight: 'semibold', whiteSpace: 'nowrap', py: '3.5' },
                    cell: { verticalAlign: 'middle', borderColor: 'border.muted', py: '3.5' },
                    row: { transition: 'background 120ms', _hover: { bg: 'bg.subtle' } },
                },
            },
            dialog: { slots: ['trigger', 'positioner', 'backdrop', 'content', 'closeTrigger', 'title', 'description', 'header', 'body', 'footer'], base: { content: { borderRadius: '2xl', bg: 'bg.panel' }, header: { borderBottomWidth: '1px', borderColor: 'border.muted', pb: '5' } } },
            nativeSelect: { slots: ['root', 'field', 'indicator'], base: { field: { borderRadius: 'lg', bg: 'bg.panel', '--focus-color': 'colors.brand.solid' } } },
        },
        tokens: {
            colors: {
                brand: {
                    50: { value: "#F0FDFA" },
                    100: { value: "#CCFBF1" },
                    200: { value: "#99F6E4" },
                    300: { value: "#5EEAD4" },
                    400: { value: "#2DD4BF" },
                    500: { value: "#0F766E" },
                    600: { value: "#0D665F" },
                    700: { value: "#115E59" },
                    800: { value: "#134E4A" },
                    900: { value: "#153E3C" },
                    950: { value: "#082F2C" },
                },
                accent: {
                    50: { value: "#FFF7ED" },
                    100: { value: "#FFEDD5" },
                    200: { value: "#FED7AA" },
                    300: { value: "#FDBA74" },
                    400: { value: "#FB923C" },
                    500: { value: "#F97316" },
                    600: { value: "#EA580C" },
                    700: { value: "#C2410C" },
                    800: { value: "#9A3412" },
                    900: { value: "#7C2D12" },
                },
                success: {
                    50: { value: "#E3F9E5" },
                    100: { value: "#C1F2C7" },
                    200: { value: "#91E697" },
                    300: { value: "#51CA58" },
                    400: { value: "#31B237" },
                    500: { value: "#18981D" },
                    600: { value: "#0F8613" },
                    700: { value: "#0E7817" },
                    800: { value: "#07600E" },
                    900: { value: "#014807" },
                },
                warning: {
                    50: { value: "#FFFBEA" },
                    100: { value: "#FFF3C4" },
                    200: { value: "#FCE588" },
                    300: { value: "#FADB5F" },
                    400: { value: "#F7C948" },
                    500: { value: "#F0B429" },
                    600: { value: "#DE911D" },
                    700: { value: "#CB6E17" },
                    800: { value: "#B44D12" },
                    900: { value: "#8D2B0B" },
                },
                danger: {
                    50: { value: "#FFE3E3" },
                    100: { value: "#FFBDBD" },
                    200: { value: "#FF9B9B" },
                    300: { value: "#F86A6A" },
                    400: { value: "#EF4E4E" },
                    500: { value: "#E12D39" },
                    600: { value: "#CF1124" },
                    700: { value: "#AB091E" },
                    800: { value: "#8A041A" },
                    900: { value: "#610316" },
                },
            },
            fonts: {
                heading: { value: "'Noto Sans Thai', 'Inter', Tahoma, sans-serif" },
                body: { value: "'Noto Sans Thai', 'Inter', Tahoma, sans-serif" },
            },
            radii: {
                sm: { value: "0.375rem" },
                md: { value: "0.5rem" },
                lg: { value: "0.75rem" },
                xl: { value: "1rem" },
                "2xl": { value: "1.5rem" },
                full: { value: "9999px" },
            },
            shadows: {
                sm: { value: "0 2px 8px rgba(20, 46, 58, 0.035)" },
                md: { value: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" },
                lg: { value: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" },
                xl: { value: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" },
                "2xl": { value: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
                glass: { value: "0 8px 32px 0 rgba(31, 38, 135, 0.15)" },
            },
        },
        semanticTokens: {
            colors: {
                nav: {
                    bg: { value: { base: '#142E3A', _dark: '#0C1B24' } },
                    fg: { value: '#D4E2E8' },
                    muted: { value: '#9BB3C0' },
                    active: { value: '#254A57' },
                },
                primary: {
                    solid: { value: "{colors.brand.500}" },
                    contrast: { value: "white" },
                },
                secondary: {
                    solid: { value: "{colors.gray.600}" },
                    contrast: { value: "white" },
                },
                bg: {
                    canvas: {
                        value: { base: "#F4F7FA", _dark: "#101C28" }
                    },
                    panel: {
                        value: { base: "#FFFFFF", _dark: "#172735" }
                    },
                    subtle: {
                        value: { base: "#F1F5F8", _dark: "#1B2E3D" }
                    },
                    muted: {
                        value: { base: "#E5EDF2", _dark: "#233847" }
                    }
                },
                fg: {
                    DEFAULT: { value: { base: '#1B3442', _dark: '#EAF2F7' } },
                    default: {
                        value: { base: "#1B3442", _dark: "#EAF2F7" }
                    },
                    muted: {
                        value: { base: "#546B7A", _dark: "#ACC0CF" }
                    },
                    subtle: {
                        value: { base: "#657D8D", _dark: "#8BA3B3" }
                    }
                },
                border: {
                    DEFAULT: { value: { base: '#DCE6ED', _dark: '#314859' } },
                    default: {
                        value: { base: "#DCE6ED", _dark: "#314859" }
                    },
                    muted: {
                        value: { base: "#EBF0F5", _dark: "#233847" }
                    }
                },
                brand: {
                    focusRing: { value: { base: '{colors.brand.600}', _dark: '{colors.brand.300}' } },
                    subtle: {
                        value: { base: "{colors.brand.50}", _dark: "{colors.brand.900}" }
                    },
                    muted: {
                        value: { base: "{colors.brand.100}", _dark: "{colors.brand.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.brand.200}", _dark: "{colors.brand.700}" }
                    },
                    solid: {
                        value: { base: "{colors.brand.500}", _dark: "{colors.brand.300}" }
                    },
                    fg: {
                        value: { base: "{colors.brand.700}", _dark: "{colors.brand.200}" }
                    },
                    contrast: {
                        value: { base: "white", _dark: "{colors.brand.950}" }
                    }
                },
                accent: {
                    subtle: {
                        value: { base: "{colors.accent.50}", _dark: "{colors.accent.900}" }
                    },
                    muted: {
                        value: { base: "{colors.accent.100}", _dark: "{colors.accent.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.accent.200}", _dark: "{colors.accent.700}" }
                    },
                    solid: {
                        value: { base: "{colors.accent.500}", _dark: "{colors.accent.400}" }
                    },
                    fg: {
                        value: { base: "{colors.accent.700}", _dark: "{colors.accent.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                },
                success: {
                    subtle: {
                        value: { base: "{colors.success.50}", _dark: "{colors.success.900}" }
                    },
                    muted: {
                        value: { base: "{colors.success.100}", _dark: "{colors.success.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.success.200}", _dark: "{colors.success.700}" }
                    },
                    solid: {
                        value: { base: "{colors.success.500}", _dark: "{colors.success.400}" }
                    },
                    fg: {
                        value: { base: "{colors.success.700}", _dark: "{colors.success.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                },
                warning: {
                    subtle: {
                        value: { base: "{colors.warning.50}", _dark: "{colors.warning.900}" }
                    },
                    muted: {
                        value: { base: "{colors.warning.100}", _dark: "{colors.warning.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.warning.200}", _dark: "{colors.warning.700}" }
                    },
                    solid: {
                        value: { base: "{colors.warning.500}", _dark: "{colors.warning.400}" }
                    },
                    fg: {
                        value: { base: "{colors.warning.700}", _dark: "{colors.warning.200}" }
                    },
                    contrast: {
                        value: "black"
                    }
                },
                danger: {
                    subtle: {
                        value: { base: "{colors.danger.50}", _dark: "{colors.danger.900}" }
                    },
                    muted: {
                        value: { base: "{colors.danger.100}", _dark: "{colors.danger.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.danger.200}", _dark: "{colors.danger.700}" }
                    },
                    solid: {
                        value: { base: "{colors.danger.500}", _dark: "{colors.danger.400}" }
                    },
                    fg: {
                        value: { base: "{colors.danger.700}", _dark: "{colors.danger.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                }
            },
        },
    },
})

export const system = createSystem(defaultConfig, customConfig)
