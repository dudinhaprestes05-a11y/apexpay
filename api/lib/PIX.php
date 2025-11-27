<?php

class PIX {
    public static function generateQRCode($amount, $pixKey, $name, $city = 'SAO PAULO', $txid = null) {
        $txid = $txid ?: self::generateTxId();

        $payload = self::buildPayload($pixKey, $name, $city, $amount, $txid);
        $payloadWithCRC = $payload . self::calculateCRC16($payload);

        return [
            'qr_code' => $payloadWithCRC,
            'qr_code_base64' => self::generateQRCodeImage($payloadWithCRC),
            'copy_paste' => $payloadWithCRC,
            'txid' => $txid
        ];
    }

    private static function buildPayload($pixKey, $name, $city, $amount, $txid) {
        $payload = '';
        $payload .= self::buildTLV('00', '01');
        $payload .= self::buildTLV('26', self::buildMerchantAccount($pixKey));
        $payload .= self::buildTLV('52', '0000');
        $payload .= self::buildTLV('53', '986');
        $payload .= self::buildTLV('54', number_format($amount, 2, '.', ''));
        $payload .= self::buildTLV('58', 'BR');
        $payload .= self::buildTLV('59', substr(strtoupper(self::removeAccents($name)), 0, 25));
        $payload .= self::buildTLV('60', substr(strtoupper(self::removeAccents($city)), 0, 15));
        $payload .= self::buildTLV('62', self::buildTLV('05', $txid));
        $payload .= '6304';

        return $payload;
    }

    private static function buildMerchantAccount($pixKey) {
        $gui = '0014BR.GOV.BCB.PIX';
        $key = '01' . str_pad(strlen($pixKey), 2, '0', STR_PAD_LEFT) . $pixKey;
        return $gui . $key;
    }

    private static function buildTLV($id, $value) {
        $length = str_pad(strlen($value), 2, '0', STR_PAD_LEFT);
        return $id . $length . $value;
    }

    private static function calculateCRC16($payload) {
        $polynomial = 0x1021;
        $crc = 0xFFFF;

        for ($i = 0; $i < strlen($payload); $i++) {
            $crc ^= (ord($payload[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if ($crc & 0x8000) {
                    $crc = (($crc << 1) ^ $polynomial) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    private static function generateQRCodeImage($text) {
        $size = 300;
        $matrix = self::generateQRMatrix($text);
        $moduleSize = floor($size / count($matrix));

        $image = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        imagefill($image, 0, 0, $white);

        for ($y = 0; $y < count($matrix); $y++) {
            for ($x = 0; $x < count($matrix[$y]); $x++) {
                if ($matrix[$y][$x]) {
                    imagefilledrectangle(
                        $image,
                        $x * $moduleSize,
                        $y * $moduleSize,
                        ($x + 1) * $moduleSize - 1,
                        ($y + 1) * $moduleSize - 1,
                        $black
                    );
                }
            }
        }

        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    private static function generateQRMatrix($text) {
        $size = 29;
        $matrix = array_fill(0, $size, array_fill(0, $size, false));

        $hash = md5($text);
        for ($i = 0; $i < strlen($hash); $i++) {
            $val = hexdec($hash[$i]);
            $y = $i % $size;
            $x = floor($i / $size) % $size;
            $matrix[$y][$x] = ($val % 2 === 0);
        }

        return $matrix;
    }

    private static function removeAccents($string) {
        $accents = [
            'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A',
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
            'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'Ç' => 'C', 'ç' => 'c', 'Ñ' => 'N', 'ñ' => 'n'
        ];
        return strtr($string, $accents);
    }

    private static function generateTxId() {
        return strtoupper(substr(md5(uniqid(rand(), true)), 0, 25));
    }
}
