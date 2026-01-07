import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudyContentWithTutor } from './StudyContentWithTutor';
import type { ContentSection, Topic } from '@/types/domain';
import { ExternalLink, ArrowRight } from 'lucide-react';

interface SectionContentProps {
  section: ContentSection;
  topic: Topic;
  isOverview: boolean;
  domainId: string;
  domainName: string;
}

export function SectionContent({ section, topic, isOverview, domainId, domainName }: SectionContentProps) {
  return (
    <div className="space-y-8">
      {/* Key Info Cards - Only on overview */}
      {isOverview && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Key Services */}
          {topic.meta.keyServices && topic.meta.keyServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key AWS Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {topic.meta.keyServices.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Concepts */}
          {topic.meta.keyConcepts && topic.meta.keyConcepts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Concepts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {topic.meta.keyConcepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Section Content */}
      <Card>
        <CardContent className="pt-6">
          <StudyContentWithTutor
            content={section.content}
            sectionTitle={section.title}
            sectionContent={section.content}
            domainId={domainId}
            domainName={domainName}
            topicId={topic.meta.id}
            topicName={topic.meta.name}
          />
        </CardContent>
      </Card>

      {/* AWS Documentation Links - Only on overview */}
      {isOverview && topic.meta.awsDocLinks && topic.meta.awsDocLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AWS Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topic.meta.awsDocLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{link.type}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
