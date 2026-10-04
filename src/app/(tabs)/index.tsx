import { useOccasion } from '@/hooks/use-occasion';
import { useWeather } from '@/hooks/use-weather';
import { OccasionCard } from '@/ui/components/occasion-card';
import { Placeholder, Screen } from '@/ui/components/screen';
import { WeatherCard } from '@/ui/components/weather-card';

export default function HeuteScreen() {
  const wetter = useWeather();
  const anlass = useOccasion();
  return (
    <Screen>
      <WeatherCard wetter={wetter} />
      <OccasionCard anzeige={anlass} />
      <Placeholder text="Die Tageswahl folgt mit Block B2." />
    </Screen>
  );
}
