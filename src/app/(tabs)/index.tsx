import { useWeather } from '@/hooks/use-weather';
import { Placeholder, Screen } from '@/ui/components/screen';
import { WeatherCard } from '@/ui/components/weather-card';

export default function HeuteScreen() {
  const wetter = useWeather();
  return (
    <Screen>
      <WeatherCard wetter={wetter} />
      <Placeholder text="Termin und Tageswahl folgen in den Blöcken A5 und B2." />
    </Screen>
  );
}
