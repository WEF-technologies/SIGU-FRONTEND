
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchFilterProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchFilter({ placeholder, value, onChange }: SearchFilterProps) {
  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 border-gray-300 focus:border-primary"
      />
    </div>
  );
}
