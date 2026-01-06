export interface SidebarSection {
  id: string;
  title: string;
  order: number;
}

export interface SidebarTopic {
  id: string;
  name: string;
  shortName: string;
  difficulty: string;
  sections: SidebarSection[];
}

export interface SidebarDomain {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  topics: SidebarTopic[];
}

export interface SidebarHierarchy {
  domains: SidebarDomain[];
}
