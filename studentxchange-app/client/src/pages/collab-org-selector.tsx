import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, GraduationCap, Users, Briefcase, ArrowRight } from 'lucide-react';

export default function CollabOrgSelector() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const organizationTypes = [
    {
      type: 'Student',
      icon: GraduationCap,
      title: 'Student',
      description: 'Individual student looking to collaborate',
      color: 'from-blue-500 to-blue-600',
    },
    {
      type: 'Club',
      icon: Users,
      title: 'Club/Organization',
      description: 'Student club, society, or campus organization',
      color: 'from-blue-500 to-blue-600',
    },
    {
      type: 'Community',
      icon: Building2,
      title: 'Community',
      description: 'Student community or collective group',
      color: 'from-green-500 to-green-600',
    },
    {
      type: 'Company',
      icon: Briefcase,
      title: 'Company',
      description: 'Startup, company, or business entity',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const handleSelect = (type: string) => {
    setSelectedType(type);
    
    if (type === 'Student') {
      // Route to student profile builder
      setLocation('/collab-student-builder');
    } else {
      // Route to organization profile builder with type
      setLocation(`/collab-org-profile?type=${type}`);
    }
  };

  const handleSkip = () => {
    // Navigate to main feed without building profile
    setLocation('/collab');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Student Collab! 🎉
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Let's set up your profile. What best describes you?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {organizationTypes.map((org) => {
            const Icon = org.icon;
            return (
              <Card
                key={org.type}
                className={`cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${
                  selectedType === org.type ? 'ring-4 ring-blue-500' : ''
                }`}
                onClick={() => handleSelect(org.type)}
                data-testid={`card-org-type-${org.type.toLowerCase()}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${org.color}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{org.title}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {org.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    size="lg"
                    data-testid={`button-select-${org.type.toLowerCase()}`}
                  >
                    Select {org.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSkip}
            className="group text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            data-testid="button-skip-profile"
          >
            Skip for now
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Don't worry, you can update your profile information later
          </p>
        </div>
      </div>
    </div>
  );
}
