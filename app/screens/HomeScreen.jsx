import { useState, useEffect, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ImageBackground,
} from "react-native";
import { SearchBar } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBarbershop } from "../service/fetchDataBarberShop";
import { getBarbershops } from "../store/barbershops";
import { getDataProfile } from "../service/fetchDataProfile";
import axiosInstance from "../service/axios";
import { login } from "../store/users";

// Fungsi Utilitas untuk Sort
const sortByDistance = (data, order) => {
  return data.sort((a, b) =>
    order === "nearest"
      ? a.distance_km - b.distance_km
      : b.distance_km - a.distance_km
  );
};

const sortByRating = (data, order) => {
  return data.sort((a, b) =>
    order === "highest"
      ? b.average_rating - a.average_rating
      : a.average_rating - b.average_rating
  );
};

const sortBarbershopData = (data, sortDistance, sortRating) => {
  let sortedData = [...data];
  if (sortDistance) sortedData = sortByDistance(sortedData, sortDistance);
  if (sortRating) sortedData = sortByRating(sortedData, sortRating);
  return sortedData;
};

const toTitleCase = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
};

// Komponen Utama HomeScreen
const HomeScreen = ({ navigation }) => {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.loggedInUser);
  const [dataNearbyBarbershop, setDataNearbyBarbershop] = useState([]);
  const [sortDistance, setSortDistance] = useState("");
  const [sortRating, setSortRating] = useState("");

  // Fungsi untuk Mendapatkan Data Barbershop
  const fetchBarbershopData = async () => {
    const data = await getBarbershop();
    dispatch(getBarbershops(data));
    getDataProfile(dispatch, user.token);
  };

  // Fungsi untuk Memuat Data Pengguna
  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("rememberedUser");
      if (!token) navigation.navigate("Login");
      dispatch(login(JSON.parse(userData)));
      alert("Welcome back, " + user.email);
    } catch (error) {
      console.error("Failed to load user data from AsyncStorage:", error);
    }
  };

  // Fungsi untuk Mengambil Data Barbershop Terdekat
  const apiNearbyBarbershop = async (latitude, longitude) => {
    try {
      const res = await axiosInstance.get(
        `/barbers/nearby?latitude=${latitude}&longitude=${longitude}`
      );
      setDataNearbyBarbershop(res.data.data);
    } catch (error) {
      console.log("Error fetching nearby barbershops:", error.response.data);
    }
  };

  // Efek Samping saat Komponen Pertama Kali Dimuat
  useEffect(() => {
    const latitude = -7.93476752; // Latitude Enigmacamp Malang
    const longitude = 112.60261667; // Longitude Enigmacamp Malang

    fetchBarbershopData();
    loadUserData();
    apiNearbyBarbershop(latitude, longitude);
  }, [dispatch]);

  // Fungsi Penyegaran Data
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBarbershopData();
    setRefreshing(false);
  };

  // Fungsi untuk Memperbarui Data Pencarian
  const updateSearch = (search) => setSearch(search);

  // Penyaringan dan Pengurutan Data Barbershop
  const filteredBarbershopData = useMemo(() => {
    let filteredData = dataNearbyBarbershop;
    if (search) {
      filteredData = filteredData.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return sortBarbershopData(filteredData, sortDistance, sortRating);
  }, [search, dataNearbyBarbershop, sortDistance, sortRating]);

  console.log(filteredBarbershopData);
  return (
    <SafeAreaView className="flex-1 mt-7 bg-black">
      <View className="px-5">
        <SearchBar
          placeholder="Search"
          onChangeText={updateSearch}
          value={search}
          containerStyle={{ backgroundColor: "#27272a", borderRadius: 10 }}
          inputContainerStyle={{ backgroundColor: "#27272a", height: 30 }}
          searchIcon={{ size: 24, color: "#d4d4d8" }}
          inputStyle={{ fontSize: 18, color: "#d4d4d8" }}
          autoFocus
          style={{ width: "100%", maxWidth: 400 }}
        />
      </View>

      <View className="flex-row justify-around mt-4">
        <TouchableOpacity
          onPress={() =>
            setSortDistance(sortDistance === "nearest" ? "farthest" : "nearest")
          }
          className="bg-zinc-700 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons
            name={sortDistance === "nearest" ? "location" : "location-outline"}
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white">
            {sortDistance === "nearest" ? "Farthest" : "Nearby"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            setSortRating(sortRating === "highest" ? "lowest" : "highest")
          }
          className="bg-zinc-700 px-4 py-2 rounded-lg flex-row items-center"
        >
          <FontAwesome6
            name={
              sortRating === "highest"
                ? "arrow-down-wide-short"
                : "arrow-up-wide-short"
            }
            size={20}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white">
            {sortRating === "highest" ? "Lowest" : "Highest"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBarbershopData.map((item) => (
          <View key={item.id} className="flex flex-col bg-black p-5">
            <View className="rounded-lg items-center">
              <ImageBackground
                source={{
                  uri: `http://10.10.102.48:8085${item.barbershop_profile_picture_id.path}`,
                }}
                style={{ height: 180, width: 280 }}
                imageStyle={{ opacity: 0.7, borderRadius: 10 }}
              >
                <View className="flex-row justify-between items-end h-full px-3 py-1">
                  <View className="flex flex-row gap-1">
                    <Ionicons
                      name="star-sharp"
                      size={14}
                      color="#ddc686"
                      style={{ opacity: 0.9 }}
                    />
                    <Text
                      className="text-white text-xs font-bold"
                      style={{ opacity: 0.9 }}
                    >
                      {item.average_rating}
                    </Text>
                  </View>
                  <View className="flex flex-row gap-1">
                    <Ionicons
                      name="location-sharp"
                      size={14}
                      color="white"
                      style={{ opacity: 0.9 }}
                    />
                    <Text
                      className="text-white text-xs font-bold"
                      style={{ opacity: 0.9 }}
                    >
                      {item.distance_km.toFixed(2)} km
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </View>
            <View className="mt-4 mb-4 ml-5 flex flex-row">
              <View className="flex flex-row items-center shadow-lg">
                <Image
                  source={{
                    uri: `http://10.10.102.48:8085${item.barbershop_profile_picture_id.path}`,
                  }}
                  className="h-10 w-10 rounded-full shadow-lg"
                />
                <Text className="font-bold text-base text-white ml-4">
                  {toTitleCase(item.name)}
                </Text>
              </View>
            </View>
            <View className="flex flex-row justify-center px-5">
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Barbershop", {
                    id: item.id,
                  })
                }
                className="bg-zinc-200 rounded-lg py-2"
                style={{ flex: 1 }}
              >
                <Text className="text-zinc-800 text-center font-bold">
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
