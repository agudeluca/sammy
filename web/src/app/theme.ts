import { createTheme } from "@mui/material/styles"

export const theme = createTheme({
  palette: {
    primary: {
      light: "#EFF2FF",
      main: "#496BE3",
      dark: "#3851D8",
      contrastText: "#fff",
    },
    secondary: {
      main: "#676779",
    },
    background: {
      default: "#F5F6F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#17171C",
      secondary: "#676779",
    },
    success: {
      main: "#4ED364",
      contrastText: "#fff",
    },
    error: {
      main: "#E74444",
    },
    warning: {
      main: "#F0B623",
    },
    grey: {
      50: "#F5F6F8",
      100: "#EEEEF1",
      200: "#DFE0E6",
      300: "#CACCD6",
      400: "#AAAABA",
      500: "#8A8A9A",
      600: "#676779",
      700: "#4F4F5E",
      800: "#3A3A45",
      900: "#17171C",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Inter", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 99,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        sizeMedium: {
          padding: "8px 20px",
        },
        sizeLarge: {
          padding: "12px 24px",
          fontSize: "1rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#496BE3",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid #EEEEF1",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#676779",
            backgroundColor: "#FAFAFC",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #EEEEF1",
          padding: "12px 16px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#F5F6F8",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.75rem",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F5F6F8",
        },
      },
    },
  },
})
