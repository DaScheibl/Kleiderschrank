import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { chooseDailyOutfit, rateCandidate } from '@/data/repositories/outfit-repository';
import type { Kandidat } from '@/domain/engine/kandidaten';
import { KATEGORIE_NAMEN } from '@/domain/modell/konstanten';
import { useDailyCandidates } from '@/hooks/use-daily-candidates';
import { useDailyChoice } from '@/hooks/use-daily-choice';
import { useToday } from '@/hooks/use-today';
import { Button } from '@/ui/components/button';
import { kandidatTeile, OutfitView } from '@/ui/components/outfit-view';
import { Placeholder, Screen } from '@/ui/components/screen';
import { SwipeCard, type SwipeRichtung } from '@/ui/components/swipe-card';
import { fontSize, fontWeight, radius, spacing } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/use-theme';

const GRUND_TEXT: Record<string, string> = {
  nicht_verfuegbar: 'alle liegen gerade in der Wäsche oder sind aussortiert',
  groesse: 'keins passt laut Größenprofil',
  waerme: 'keins passt zum heutigen Wetter',
  formalitaet: 'keins ist für den heutigen Anlass ordentlich genug',
  nicht_regentauglich: 'keins ist regentauglich',
  keine_teile: 'es gibt noch keins im Schrank',
};

export default function OutfitScreen() {
  const { colors } = useTheme();
  const datum = useToday();
  const { bereit, ergebnis, anlass } = useDailyCandidates(datum);
  const { bewertet, wahl } = useDailyChoice(datum);

  // "Nochmal durchsehen": dieselben Kandidaten in neuer Reihenfolge, Bewertungen werden überschrieben.
  const [runde, setRunde] = useState<{ reihenfolge: string[]; gewischt: Set<string> } | null>(null);

  const kandidaten = useMemo(() => ergebnis?.kandidaten ?? [], [ergebnis]);
  const offen = useMemo(() => {
    if (runde) {
      return runde.reihenfolge
        .filter((s) => !runde.gewischt.has(s))
        .map((s) => kandidaten.find((k) => k.schluessel === s))
        .filter((k): k is Kandidat => k !== undefined);
    }
    return kandidaten.filter((k) => !bewertet.has(k.schluessel));
  }, [kandidaten, bewertet, runde]);
  const gemocht = kandidaten.filter(
    (k) => bewertet.get(k.schluessel)?.outfit.bewertung === 'gefaellt',
  );

  if (wahl?.outfit.getragen) {
    return (
      <Screen>
        <Placeholder text="Dein Outfit für heute steht fest und ist getragen. Morgen gibt es einen neuen Stapel." />
        <OutfitView
          titel={wahl.outfit.titel}
          begruendung={wahl.outfit.begruendung}
          teile={wahl.teile}
        />
      </Screen>
    );
  }

  if (!bereit || !ergebnis) {
    return (
      <Screen>
        <Placeholder text="Vorschläge werden vorbereitet …" />
      </Screen>
    );
  }

  if (ergebnis.fehlend.length > 0) {
    return (
      <Screen>
        <Text style={[styles.titel, { color: colors.text }]}>Heute kein vollständiges Outfit</Text>
        {ergebnis.fehlend.map((f) => (
          <Text key={f.kategorie} style={{ color: colors.text, fontSize: fontSize.body }}>
            {KATEGORIE_NAMEN[f.kategorie]}: {GRUND_TEXT[f.grund] ?? f.grund}.
          </Text>
        ))}
        <Button
          label="Zum Schrank"
          variant="secondary"
          onPress={() => router.navigate('/schrank')}
        />
      </Screen>
    );
  }

  function wischen(k: Kandidat, richtung: SwipeRichtung) {
    rateCandidate(k, richtung === 'rechts' ? 'gefaellt' : 'abgelehnt', datum, anlass);
    if (runde) setRunde({ ...runde, gewischt: new Set([...runde.gewischt, k.schluessel]) });
  }

  function nehmen(k: Kandidat) {
    try {
      const id = bewertet.get(k.schluessel)?.outfit.id ?? rateCandidate(k, 'offen', datum, anlass);
      chooseDailyOutfit(id, datum);
      setRunde(null);
      router.navigate('/');
    } catch (e) {
      Alert.alert('Nicht möglich', e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  }

  const aktuelle = offen[0];
  if (aktuelle) {
    const position = kandidaten.length - offen.length + 1;
    return (
      <Screen>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.caption }}>
          Vorschlag {position} von {kandidaten.length} · rechts gefällt mir, links weiter
        </Text>
        <SwipeCard key={`${aktuelle.schluessel}-${position}`} onSwipe={(r) => wischen(aktuelle, r)}>
          <OutfitView
            titel={aktuelle.titel}
            begruendung={aktuelle.begruendung}
            teile={kandidatTeile(aktuelle)}
          />
        </SwipeCard>
        <View style={styles.knoepfe}>
          <View style={styles.knopf}>
            <Button label="Weiter" variant="secondary" onPress={() => wischen(aktuelle, 'links')} />
          </View>
          <View style={styles.knopf}>
            <Button label="Gefällt mir" onPress={() => wischen(aktuelle, 'rechts')} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {gemocht.length > 0 ? (
        <>
          <Text style={[styles.titel, { color: colors.text }]}>Welches ziehst du heute an?</Text>
          {gemocht.map((k) => {
            const istWahl = wahl?.outfit.kombinationsSchluessel === k.schluessel;
            return (
              <View
                key={k.schluessel}
                style={[
                  styles.box,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: istWahl ? colors.accent : colors.border,
                  },
                ]}>
                <OutfitView titel={k.titel} begruendung={k.begruendung} teile={kandidatTeile(k)} />
                <Button
                  label={istWahl ? 'Ist deine Wahl für heute' : 'Das nehme ich'}
                  onPress={() => nehmen(k)}
                  disabled={istWahl}
                />
              </View>
            );
          })}
        </>
      ) : (
        <>
          <Text style={[styles.titel, { color: colors.text }]}>Nichts dabei?</Text>
          <Placeholder text="Du kannst den Stapel neu gemischt noch einmal durchsehen oder den besten Vorschlag nehmen." />
          <Button label="Besten Vorschlag nehmen" onPress={() => nehmen(kandidaten[0]!)} />
        </>
      )}
      <Button
        label="Stapel neu mischen"
        variant="secondary"
        onPress={() =>
          setRunde({
            reihenfolge: [...kandidaten].sort(() => Math.random() - 0.5).map((k) => k.schluessel),
            gewischt: new Set(),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titel: { fontSize: fontSize.title, fontWeight: fontWeight.bold },
  knoepfe: { flexDirection: 'row', gap: spacing.md },
  knopf: { flex: 1 },
  box: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
