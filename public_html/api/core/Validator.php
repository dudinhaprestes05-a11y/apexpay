<?php

class Validator {
    private $data;
    private $rules;
    private $errors = [];

    public function __construct($data, $rules) {
        $this->data = $data;
        $this->rules = $rules;
    }

    public function validate() {
        foreach ($this->rules as $field => $rules) {
            $value = $this->data[$field] ?? null;
            $rulesList = is_string($rules) ? explode('|', $rules) : $rules;

            foreach ($rulesList as $rule) {
                $this->applyRule($field, $value, $rule);
            }
        }

        return empty($this->errors);
    }

    private function applyRule($field, $value, $rule) {
        if (strpos($rule, ':') !== false) {
            [$ruleName, $parameter] = explode(':', $rule, 2);
        } else {
            $ruleName = $rule;
            $parameter = null;
        }

        $method = 'validate' . ucfirst($ruleName);

        if (method_exists($this, $method)) {
            $this->$method($field, $value, $parameter);
        }
    }

    private function validateRequired($field, $value) {
        if ($value === null || $value === '') {
            $this->errors[$field][] = "O campo $field é obrigatório";
        }
    }

    private function validateEmail($field, $value) {
        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = "O campo $field deve ser um email válido";
        }
    }

    private function validateMin($field, $value, $min) {
        if ($value !== null && strlen($value) < $min) {
            $this->errors[$field][] = "O campo $field deve ter no mínimo $min caracteres";
        }
    }

    private function validateMax($field, $value, $max) {
        if ($value !== null && strlen($value) > $max) {
            $this->errors[$field][] = "O campo $field deve ter no máximo $max caracteres";
        }
    }

    private function validateNumeric($field, $value) {
        if ($value !== null && !is_numeric($value)) {
            $this->errors[$field][] = "O campo $field deve ser numérico";
        }
    }

    private function validateIn($field, $value, $options) {
        $allowed = explode(',', $options);
        if ($value !== null && !in_array($value, $allowed)) {
            $this->errors[$field][] = "O campo $field deve ser um dos valores: " . implode(', ', $allowed);
        }
    }

    private function validateCpf($field, $value) {
        if ($value && !$this->isValidCPF($value)) {
            $this->errors[$field][] = "O campo $field não é um CPF válido";
        }
    }

    private function validateCnpj($field, $value) {
        if ($value && !$this->isValidCNPJ($value)) {
            $this->errors[$field][] = "O campo $field não é um CNPJ válido";
        }
    }

    private function validateCpfCnpj($field, $value) {
        if ($value) {
            $clean = preg_replace('/[^0-9]/', '', $value);
            if (strlen($clean) === 11) {
                $this->validateCpf($field, $value);
            } elseif (strlen($clean) === 14) {
                $this->validateCnpj($field, $value);
            } else {
                $this->errors[$field][] = "O campo $field deve ser um CPF ou CNPJ válido";
            }
        }
    }

    private function isValidCPF($cpf) {
        $cpf = preg_replace('/[^0-9]/', '', $cpf);

        if (strlen($cpf) != 11 || preg_match('/(\d)\1{10}/', $cpf)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) {
                return false;
            }
        }

        return true;
    }

    private function isValidCNPJ($cnpj) {
        $cnpj = preg_replace('/[^0-9]/', '', $cnpj);

        if (strlen($cnpj) != 14 || preg_match('/(\d)\1{13}/', $cnpj)) {
            return false;
        }

        $length = strlen($cnpj) - 2;
        $numbers = substr($cnpj, 0, $length);
        $digits = substr($cnpj, $length);
        $sum = 0;
        $pos = $length - 7;

        for ($i = $length; $i >= 1; $i--) {
            $sum += $numbers[$length - $i] * $pos--;
            if ($pos < 2) {
                $pos = 9;
            }
        }

        $result = $sum % 11 < 2 ? 0 : 11 - $sum % 11;
        if ($result != $digits[0]) {
            return false;
        }

        $length = $length + 1;
        $numbers = substr($cnpj, 0, $length);
        $sum = 0;
        $pos = $length - 7;

        for ($i = $length; $i >= 1; $i--) {
            $sum += $numbers[$length - $i] * $pos--;
            if ($pos < 2) {
                $pos = 9;
            }
        }

        $result = $sum % 11 < 2 ? 0 : 11 - $sum % 11;

        return $result == $digits[1];
    }

    public function errors() {
        return $this->errors;
    }

    public function firstError() {
        foreach ($this->errors as $field => $errors) {
            return $errors[0];
        }
        return null;
    }
}
