import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ExpoImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius, Dimensions } from '@/constants/styleGuide';

interface ImagePickerProps {
  selectedImages: string[]; // Array of image URIs (local or remote)
  onSelectImages: (images: string[]) => void;
  compact?: boolean; // For a smaller inline display
  onPhotoPress?: (uri: string) => void;
}

export default function ImagePicker({ selectedImages, onSelectImages, compact = false, onPhotoPress }: ImagePickerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const cameraStatus = await ExpoImagePicker.requestCameraPermissionsAsync();
        const mediaLibraryStatus = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
        setHasCameraPermission(cameraStatus.status === 'granted');
        setHasMediaLibraryPermission(mediaLibraryStatus.status === 'granted');
      } else {
        // Web doesn't need explicit permission requests for media library access
        setHasMediaLibraryPermission(true);
      }
    })();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'web') return true; // Permissions are different on web

    const { status: cameraStatus } = await ExpoImagePicker.requestCameraPermissionsAsync();
    const { status: mediaLibraryStatus } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant camera and media library permissions to upload images.'
      );
      setHasCameraPermission(false);
      setHasMediaLibraryPermission(false);
      return false;
    }
    setHasCameraPermission(true);
    setHasMediaLibraryPermission(true);
    return true;
  };

  const handleChooseImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      return;
    }

    let result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newImageUris = result.assets.map(asset => asset.uri);
      onSelectImages([...selectedImages, ...newImageUris]);
    }
  };

  const handleRemoveImage = (uriToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updatedImages = selectedImages.filter(uri => uri !== uriToRemove);
    onSelectImages(updatedImages);
  };

  if (hasMediaLibraryPermission === null && Platform.OS !== 'web') {
    return <Text>Requesting for media library permission...</Text>;
  }

  return (
    <View style={compact ? styles.compactContainer : styles.fullContainer}>
      <ScrollView horizontal contentContainerStyle={styles.imageScrollContainer} showsHorizontalScrollIndicator={false}>
        {selectedImages.map((uri, index) => (
          <View key={index} style={styles.imageThumbnailContainer}>
            <TouchableOpacity onPress={() => {
              if (onPhotoPress) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPhotoPress(uri);
              }
            }}>
              <Image source={{ uri }} style={styles.imageThumbnail} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveImage(uri)} style={styles.removeImageButton}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addImageButton} onPress={handleChooseImage}>
          <Ionicons name="add" size={32} color={Colors.gray} />
          <Text style={styles.addImageText}>Add Photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    marginBottom: Spacing.gap.medium,
  },
  compactContainer: {
    marginBottom: Spacing.form.fieldGap,
  },
  compactLabel: {
    fontSize: Typography.fontSize.medium,
    fontFamily: 'Nunito_700Bold',
    color: Colors.black,
    marginBottom: Spacing.form.labelGap,
    marginLeft: 6,
  },
  imageScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.gap.xs,
  },
  imageThumbnailContainer: {
    marginRight: Spacing.gap.small,
    position: 'relative',
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.white,
    borderRadius: 10,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  addImageText: {
    fontSize: Typography.fontSize.small,
    fontFamily: 'Nunito_400Regular',
    color: Colors.gray,
    marginTop: Spacing.gap.xs,
  },
});