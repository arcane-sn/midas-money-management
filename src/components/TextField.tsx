import { TextInput, View, Text, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { colors, fonts } from '@/theme';

interface TextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  prefix?: string;
}

export function TextField({ value, onChangeText, placeholder, keyboardType, multiline, prefix }: TextFieldProps) {
  return (
    <View style={styles.row}>
      {prefix ? (
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>{prefix}</Text>
        </View>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, prefix ? styles.inputWithPrefix : null, multiline ? styles.multiline : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  prefix: { borderWidth: 2, borderColor: colors.ink, borderRightWidth: 0, backgroundColor: colors.surface, paddingHorizontal: 12, justifyContent: 'center' },
  prefixText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textSecondary },
  input: { flex: 1, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 12, fontFamily: fonts.semiBold, fontSize: 15, color: colors.ink },
  inputWithPrefix: { borderLeftWidth: 0 },
  multiline: { minHeight: 80, textAlignVertical: 'top', fontFamily: fonts.medium },
});
