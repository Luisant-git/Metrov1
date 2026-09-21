import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme';

export default function ProjectPicker({
  visible,
  projects = [],
  selectedProjectId,
  selectedSiteId,
  onSelectProject,
  onSelectSite,
  onClose,
}) {
  const selectedProject = projects.find((project) => project.id === Number(selectedProjectId));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Project</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={projects}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelectedProject = Number(selectedProjectId) === Number(item.id);
              const projectPlots = item.plots || [];

              return (
                <View style={styles.projectCard}>
                  <Pressable
                    onPress={() => onSelectProject(item)}
                    style={[styles.projectRow, isSelectedProject && styles.projectRowSelected]}>
                    <View style={styles.projectTextWrap}>
                      <Text style={styles.projectName}>{item.name}</Text>
                      <Text style={styles.projectMeta}>{item.location}</Text>
                    </View>
                    <Text style={styles.count}>{projectPlots.length}</Text>
                  </Pressable>

                  {isSelectedProject && projectPlots.length > 0 && (
                    <View style={styles.plotWrap}>
                      {projectPlots.map((plot) => {
                        const isSelectedSite = Number(selectedSiteId) === Number(plot.id);
                        return (
                          <Pressable
                            key={plot.id}
                            onPress={() => onSelectSite(plot.id)}
                            style={[styles.plotItem, isSelectedSite && styles.plotItemSelected]}>
                            <Text style={[styles.plotText, isSelectedSite && styles.plotTextSelected]}>
                              {plot.siteNo || `Plot ${plot.id}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.gray900,
  },
  close: {
    fontSize: 18,
    color: colors.slate500,
  },
  list: {
    padding: 16,
  },
  projectCard: {
    marginBottom: 10,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  projectRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  projectTextWrap: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate800,
  },
  projectMeta: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 2,
  },
  count: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.blue50,
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plotWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  plotItem: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  plotItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  plotText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: '600',
  },
  plotTextSelected: {
    color: colors.primaryDark,
  },
});
