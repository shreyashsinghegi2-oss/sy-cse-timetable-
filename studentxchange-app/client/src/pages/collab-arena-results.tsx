import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, ArrowLeft, Award, Medal, Gift, Mail, 
  Users, Sparkles, Star, Crown, CheckCircle
} from "lucide-react";

export default function CollabArenaResults() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/collab-arena')}
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collab Arena
        </Button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium mb-4">
            <Trophy className="h-4 w-4" />
            Official Results
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Collab Arena – Official Results
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-3">
            An online student competition conducted by StudentXchange, in collaboration with the Entrepreneurship Club, Ajeenkya DY Patil University (ADYPU).
          </p>
          <p className="text-blue-600 font-medium">
            Thank you to all participants for making Collab Arena a success.
          </p>
        </div>

        <div className="space-y-6 mb-10">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-100 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Creative House</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border-2 border-yellow-400">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <span className="font-bold text-yellow-700">Winner</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 ml-9">Aditya Telang</p>
                </div>
                
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Medal className="h-6 w-6 text-gray-400" />
                    <span className="font-bold text-gray-600">Runner-Up (Shared Position)</span>
                  </div>
                  <ul className="ml-9 space-y-1">
                    <li className="text-gray-800 font-medium">Rahul Patil</li>
                    <li className="text-gray-800 font-medium">Vaishnavi Mahesh Jambhale</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-2xl">💻</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">House of Tech</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border-2 border-yellow-400">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <span className="font-bold text-yellow-700">Winner</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 ml-9">Chaitanya Satyanarayana Gali</p>
                </div>
                
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Medal className="h-6 w-6 text-gray-400" />
                    <span className="font-bold text-gray-600">Runner-Up</span>
                  </div>
                  <p className="text-gray-800 font-medium ml-9">Asim Malik</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-100 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                  <span className="text-2xl">💡</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Innovation Idea</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border-2 border-yellow-400">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                    <span className="font-bold text-yellow-700">Winner</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 ml-9">Harshad Patil</p>
                </div>
                
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Medal className="h-6 w-6 text-gray-400" />
                    <span className="font-bold text-gray-600">Runner-Up</span>
                  </div>
                  <p className="text-gray-800 font-medium ml-9">Binayak Hazra</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="h-6 w-6" />
              <h2 className="text-xl font-bold">Prize & Certificate Information</h2>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <p className="font-medium mb-3">All winners and runner-ups will receive:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span>💰</span>
                  <span>Cash Prize</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🏅</span>
                  <span>Physical Certificate</span>
                </li>
              </ul>
              <p className="mt-4 text-green-100 text-sm">
                Physical certificates and prize distribution will be completed within the coming days through the respective college campus / official communication.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white rounded-xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Participant Appreciation</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                We sincerely thank all participants for their efforts and enthusiasm.
              </p>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                  <p>
                    All other valid participants will receive a <strong>📄 Digital Certificate</strong>, which will be sent to their registered email IDs.
                  </p>
                </div>
              </div>
              <p className="text-blue-600 font-medium">
                Stay connected with StudentXchange for many more collaborations and events ahead.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gray-900 text-white">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold">Collaboration</h2>
            </div>
            <div className="space-y-2 text-gray-300">
              <p className="font-semibold text-white">Conducted by StudentXchange</p>
              <p>In collaboration with the Entrepreneurship Club,</p>
              <p>Ajeenkya DY Patil University (ADYPU)</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">© 2025 StudentXchange. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
