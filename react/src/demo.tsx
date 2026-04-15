import AnimatedDropdown from "./components/ui/animated-dropdown";

export default function Demo() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-white">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Animated Dropdown Integration</h2>
        <p className="text-muted-foreground">Test the Emerald UI transitions below.</p>
        <AnimatedDropdown 
          text="Select IPL Season"
          items={[
            { name: '2025 Season', link: '#' },
            { name: '2024 Season', link: '#' },
            { name: '2023 Season', link: '#' },
            { name: '2022 Season', link: '#' }
          ]}
        />
      </div>
    </div>
  );
}
