"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  MapPin,
  User,
  Waves,
  TreePine,
  BarChart3
} from "lucide-react";

// Sample NGO data – Kolkata-based organisations
const ngoData = [
  {
    id: "ngo-001",
    name: "Hooghly River Conservation Trust",
    logo: <Waves className="h-6 w-6 text-teal-600" />,
    location: "Kolkata, West Bengal",
    established: "2016",
    description: "Dedicated to the ecological restoration of the Hooghly River and its tributaries. Leads community-driven riverbank clean-up drives, water-quality monitoring, and anti-encroachment campaigns. Successfully delivered 28 projects in partnership with the West Bengal Pollution Control Board.",
    tags: ["River Restoration", "Water Quality", "Community Engagement"],
    rating: 4.8,
    projects: 28,
    years: "8+",
    success: "89%",
    isTopRated: true,
    logoColor: "text-teal-600"
  },
  {
    id: "ngo-002",
    name: "Sabuj Mancha Kolkata",
    logo: <TreePine className="h-6 w-6 text-green-600" />,
    location: "Kolkata, West Bengal",
    established: "2018",
    description: "Advocates for urban green spaces, rooftop gardens, and tree-cover expansion across Kolkata's neighbourhoods. Partnered with the Kolkata Municipal Corporation on 19 urban-greening and heat-island mitigation projects, including the Salt Lake Bio-Corridor Initiative.",
    tags: ["Urban Greening", "Heat Island Mitigation", "Policy Advocacy"],
    rating: 4.1,
    projects: 19,
    years: "6+",
    success: "82%",
    isTopRated: false,
    logoColor: "text-green-600"
  },
  {
    id: "ngo-003",
    name: "Sundarbans Environment Research Institute",
    logo: <BarChart3 className="h-6 w-6 text-amber-600" />,
    location: "Kolkata & South 24 Parganas, West Bengal",
    established: "2013",
    description: "A research-intensive organisation focused on mangrove conservation, coastal biodiversity monitoring, and climate-resilience studies in the Sundarbans delta. Holds active MOUs with Jadavpur University and IIT Kharagpur, and has led 35 field-research and habitat-restoration projects.",
    tags: ["Mangrove Conservation", "Coastal Research", "Climate Resilience"],
    rating: 4.6,
    projects: 35,
    years: "11+",
    success: "93%",
    isTopRated: false,
    logoColor: "text-amber-600"
  },
  {
    id: "ngo-004",
    name: "Paribesh Bachao Andolan",
    logo: <TreePine className="h-6 w-6 text-blue-600" />,
    location: "Kolkata, West Bengal",
    established: "2020",
    description: "A grassroots movement tackling air-quality degradation and industrial pollution in and around Kolkata. Runs citizen-science air-monitoring networks, organises legal-awareness workshops, and has successfully mobilised 12 community-led pollution-reduction campaigns in collaboration with local panchayats.",
    tags: ["Air Quality", "Industrial Pollution", "Citizen Science"],
    rating: 3.9,
    projects: 12,
    years: "4+",
    success: "75%",
    isTopRated: false,
    logoColor: "text-blue-600"
  }
];

export interface NGOSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNGO: (ngo: any) => void;
  projectLocation: string;
}

export function NGOSelectionModal({
  isOpen,
  onClose,
  onSelectNGO,
  projectLocation
}: NGOSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  
  // Filter NGOs based on search query
  const filteredNGOs = ngoData.filter(ngo =>
    ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    ngo.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort NGOs based on selected criteria
  const sortedNGOs = [...filteredNGOs].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "experience":
        return parseInt(b.years) - parseInt(a.years);
      case "projects":
        return b.projects - a.projects;
      case "location":
        // Sort by location with the project location first
        if (a.location.includes(projectLocation)) return -1;
        if (b.location.includes(projectLocation)) return 1;
        return a.location.localeCompare(b.location);
      default:
        return 0;
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0 w-[90vw]">
        <DialogHeader className="px-8 pt-6 pb-4 border-b border-border/30 flex-shrink-0">
          <DialogTitle className="text-xl font-serif flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Select Partner NGO
          </DialogTitle>
          <DialogDescription>
            Based on your project location ({projectLocation}), we found these NGOs with relevant experience.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <div className="space-y-6 mt-4">
          <div className="flex items-center justify-between pb-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute top-2.5 left-2.5 text-muted-foreground" />
                <Input 
                  placeholder="Search NGOs..." 
                  className="glass border-border/30 pl-9 w-[250px]" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-9 text-xs glass border-border/30">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Sort by Rating</SelectItem>
                  <SelectItem value="experience">Sort by Experience</SelectItem>
                  <SelectItem value="projects">Sort by Projects</SelectItem>
                  <SelectItem value="location">Sort by Location</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="w-3.5 h-3.5 mr-1" /> Filter
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {sortedNGOs.length > 0 ? (
              sortedNGOs.map((ngo) => (
                <div 
                  key={ngo.id}
                  className="bg-muted/30 rounded-lg border border-border/30 p-4 hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        {ngo.logo}
                      </div>
                      <div>
                        <h3 className="font-medium">{ngo.name}</h3>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          <span>{ngo.location}</span>
                          <span className="mx-2">•</span>
                          <span>Est. {ngo.established}</span>
                          {ngo.isTopRated && (
                            <Badge className="ml-2 bg-emerald-500/20 text-emerald-600 border-emerald-600/20 text-[10px]">
                              Top Rated
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const colorMap: { [key: string]: string } = {
                          "text-teal-600": "#14b8a6",
                          "text-blue-600": "#2563eb",
                          "text-amber-600": "#d97706",
                          "text-green-600": "#16a34a"
                        };
                        const fillColor = colorMap[ngo.logoColor] || "#14b8a6";
                        return (
                          <svg 
                            key={star} 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill={star <= ngo.rating ? fillColor : "none"} 
                            stroke={fillColor}
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        );
                      })}
                      <span className={`text-sm font-medium ml-1 ${ngo.logoColor}`}>{ngo.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-3">
                    {ngo.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ngo.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-muted/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium">{ngo.projects}</div>
                        <div className="text-xs text-muted-foreground">Projects</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{ngo.years}</div>
                        <div className="text-xs text-muted-foreground">Years</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{ngo.success}</div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                    </div>
                    <Button onClick={() => onSelectNGO(ngo)}>Select NGO</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No NGOs match your search criteria.</p>
              </div>
            )}
          </div>
          
          {sortedNGOs.length > 0 && (
            <div className="flex justify-center py-2">
              <Button variant="link" className="text-sm">View More NGOs</Button>
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/30 px-8 pb-6 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
