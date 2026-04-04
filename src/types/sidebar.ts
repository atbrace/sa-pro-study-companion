export interface SidebarSection {
  id: string;
  title: string;
  order: number;
}

export interface SidebarTopicProgress {
  masteryScore: number;
  isWeakArea: boolean;
}

export interface SidebarDomainProgress {
  masteryScore: number;
  topicsCompleted: number;
  totalTopics: number;
  weakTopicIds: string[];
}

export interface SidebarTopic {
  id: string;
  name: string;
  shortName: string;
  difficulty: string;
  sections: SidebarSection[];
  progress?: SidebarTopicProgress;
}

export interface SidebarDomain {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  topics: SidebarTopic[];
  progress?: SidebarDomainProgress;
}

export interface SidebarHierarchy {
  domains: SidebarDomain[];
  overallMastery?: number;
}
