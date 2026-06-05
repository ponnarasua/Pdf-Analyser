import { Step } from "@/types/analysis";

export const BACKEND_URL = "";

export const INITIAL_STEPS: Step[] = [
  { name: "Downloading PDF", status: "pending" },
  { name: "Extracting Text", status: "pending" },
  { name: "Detecting Tables & Images", status: "pending" },
  { name: "AI Analysis", status: "pending" },
  { name: "Finalizing", status: "pending" },
];

export const QUICK_TESTS = [
  {
    label: "Attention Is All You Need",
    url: "https://arxiv.org/pdf/1706.03762",
    badge: "Research Paper",
  },
  {
    label: "Sample PDF",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    badge: "Dummy PDF",
  },
];
