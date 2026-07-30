export type ThemeStyle = 'Minimal' | 'Corporate' | 'Creative';

export interface GeneratedFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  files: GeneratedFile[];
  updatedAt: number;
}

export interface WebsiteData {
  theme: ThemeStyle;
  isDark: boolean;
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  about: {
    title: string;
    content: string;
  };
  contact: {
    title: string;
    email: string;
    phone: string;
  };
  files: GeneratedFile[];
}
